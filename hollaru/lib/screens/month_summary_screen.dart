import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class MonthSummaryScreen extends StatefulWidget {
  final String messId;
  final String monthId;

  const MonthSummaryScreen({super.key, required this.messId, required this.monthId});

  @override
  State<MonthSummaryScreen> createState() => _MonthSummaryScreenState();
}

class _MonthSummaryScreenState extends State<MonthSummaryScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _memberSummaries = [];
  double _mealRate = 0.0;
  int _totalMessMeals = 0;
  double _totalMessCost = 0.0;

  @override
  void initState() {
    super.initState();
    _calculateMonthData();
  }

  // --- CORE CALCULATION LOGIC ---
  Future<void> _calculateMonthData() async {
    try {
      // 1. Get Mess Members
      var messDoc = await FirebaseFirestore.instance.collection('messes').doc(widget.messId).get();
      List<dynamic> memberIds = messDoc['members'];

      // 2. Data Container Ready Kora
      Map<String, int> memberMealCounts = {for (var id in memberIds) id: 0};
      Map<String, double> memberDeposits = {for (var id in memberIds) id: 0.0};
      Map<String, String> memberNames = {};

      // 3. Member Names Ana
      for (String uid in memberIds) {
        var userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
        if (userDoc.exists) {
          memberNames[uid] = userDoc['name'] ?? "Unknown";
        } else {
          memberNames[uid] = "Unknown Member";
        }
      }

      // 4. Total Bazaar Cost Ana
      var bazaarSnapshot = await FirebaseFirestore.instance
          .collection('messes').doc(widget.messId)
          .collection('monthly_data').doc(widget.monthId)
          .collection('bazaar_items')
          .where('status', isEqualTo: 'completed')
          .get();

      double totalCost = 0;
      for (var doc in bazaarSnapshot.docs) {
        totalCost += (doc['cost'] as num? ?? 0).toDouble();
      }

      // 5. Deposits Ana
      var depositSnapshot = await FirebaseFirestore.instance
          .collection('messes').doc(widget.messId)
          .collection('monthly_data').doc(widget.monthId)
          .collection('deposits')
          .get();

      for (var doc in depositSnapshot.docs) {
        // Jodi member_id na thake, added_by nibe
        String uid = doc['member_id'] ?? doc['added_by'];
        if (memberDeposits.containsKey(uid)) {
          memberDeposits[uid] = (memberDeposits[uid] ?? 0) + (doc['amount'] as num? ?? 0).toDouble();
        }
      }

      // 6. MEAL CALCULATION (Smart Replay)
      var logsSnapshot = await FirebaseFirestore.instance
          .collection('messes').doc(widget.messId)
          .collection('monthly_data').doc(widget.monthId)
          .collection('daily_logs')
          .get();

      int globalTotalMeals = 0;

      for (var log in logsSnapshot.docs) {
        var data = log.data();

        // Lunch Check (Status 'closed' na holei count hobe)
        if (data['lunch_status'] != 'closed') {
          _processMealForDay(memberIds, data, 'lunch', memberMealCounts);
        }

        // Dinner Check
        if (data['dinner_status'] != 'closed') {
          _processMealForDay(memberIds, data, 'dinner', memberMealCounts);
        }
      }

      // Sum global meals
      memberMealCounts.forEach((key, value) {
        globalTotalMeals += value;
      });

      // 7. Final Math (Rate & Balance)
      double rate = globalTotalMeals > 0 ? (totalCost / globalTotalMeals) : 0;

      List<Map<String, dynamic>> finalSummaries = [];

      memberMealCounts.forEach((uid, meals) {
        double deposit = memberDeposits[uid] ?? 0;
        double cost = meals * rate;
        double balance = deposit - cost; // Positive = Pabe, Negative = Dibe

        finalSummaries.add({
          'name': memberNames[uid] ?? "User",
          'meals': meals,
          'deposit': deposit,
          'cost': cost,
          'balance': balance,
        });
      });

      setState(() {
        _totalMessCost = totalCost;
        _totalMessMeals = globalTotalMeals;
        _mealRate = rate;
        _memberSummaries = finalSummaries;
        _isLoading = false;
      });

    } catch (e) {
      debugPrint("Calculation Error: $e");
      setState(() => _isLoading = false);
      if(mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
      }
    }
  }

  // Helper Function: Specific Meal Type (Lunch/Dinner) er hisab
  void _processMealForDay(List<dynamic> allMembers, Map<String, dynamic> data, String type, Map<String, int> counts) {
    // Safe Map Casting
    Map<dynamic, dynamic> requests = (data['requests'] as Map?) ?? {};

    for (String uid in allMembers) {
      int increment = 1; // Default: Sabai khabe (1)

      // Request Check logic
      // Amra check korbo ei UID er kono Approved Meal Off ache kina

      bool isOff = false;
      int guestAdd = 0;

      for (var entry in requests.entries) {
        var val = entry.value;
        if (val is Map) {
          // Check if request belongs to this user
          if (val['requested_by'] == uid || entry.key == uid) {
            if (val['type'] == type && val['status'] == 'approved') {
              // Case 1: Meal OFF
              if (val['category'] == 'off') {
                isOff = true;
              }
              // Case 2: Guest Add
              if (val['category'] == 'guest') {
                guestAdd += (val['count'] as int? ?? 0);
              }
            }
          }
        }
      }

      if (isOff) increment = 0; // Off thakle 0

      // Total = (Nijer Meal) + (Guest Meal)
      // Note: Off thakleo Guest thakte pare
      counts[uid] = (counts[uid] ?? 0) + increment + guestAdd;
    }
  }

  // --- CLOSE MONTH LOGIC ---
  Future<void> _closeMonth() async {
    bool confirm = await showDialog(
        context: context,
        builder: (c) => AlertDialog(
          title: const Text("Finalize Month?"),
          content: const Text("This will archive current data. Make sure all bazaar costs are entered."),
          actions: [
            TextButton(onPressed: ()=>Navigator.pop(c, false), child: const Text("Cancel")),
            ElevatedButton(onPressed: ()=>Navigator.pop(c, true), child: const Text("Confirm Close")),
          ],
        )
    ) ?? false;

    if (confirm) {
      await FirebaseFirestore.instance.collection('messes').doc(widget.messId).update({
        'is_month_active': false, // Month Bondho
        'meal_rate': _mealRate, // Rate saved
      });
      if(mounted) {
        Navigator.pop(context); // Go back
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Month Closed Successfully!")));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Month Summary Report")),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
        children: [
          // 1. HEADER SUMMARY
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.blue.shade50,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _infoBox("Total Cost", "৳${_totalMessCost.toStringAsFixed(0)}"),
                    _infoBox("Total Meals", "$_totalMessMeals"),
                    _infoBox("Meal Rate", "৳${_mealRate.toStringAsFixed(2)}"),
                  ],
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // 2. MEMBER LIST
          Expanded(
            child: ListView.builder(
              itemCount: _memberSummaries.length,
              itemBuilder: (context, index) {
                var m = _memberSummaries[index];
                // Due hole Red, Pabe hole Green
                bool isDue = m['balance'] < 0;

                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(m['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Text(
                              isDue ? "Dibe: ৳${m['balance'].abs().toStringAsFixed(1)}" : "Pabe: ৳${m['balance'].toStringAsFixed(1)}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isDue ? Colors.red : Colors.green,
                                  fontSize: 16
                              ),
                            ),
                          ],
                        ),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Meal: ${m['meals']}"),
                            Text("Joma: ৳${m['deposit']}"),
                            Text("Cost: ৳${m['cost'].toStringAsFixed(1)}"),
                          ],
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // 3. ARCHIVE BUTTON
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                onPressed: _closeMonth,
                icon: const Icon(Icons.archive),
                label: const Text("ARCHIVE & CLOSE MONTH"),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _infoBox(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}