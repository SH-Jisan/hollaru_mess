import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../mess_settings_screen.dart';
import '../month_summary_screen.dart';
import '../month_history_screen.dart'; // নতুন স্ক্রিন ইম্পোর্ট
import '../members_screen.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  // --- LOGIC 1: LOGOUT ---
  void _logout(BuildContext context) async {
    await FirebaseAuth.instance.signOut();
  }

  // --- LOGIC 2: START NEW MONTH (UPDATED WITH UNIQUE ID) ---
  Future<void> _startNewMonth(BuildContext context, String messId) async {
    try {
      // ফিক্স: নামের সাথে মিলিসেকেন্ড যোগ করা হলো যাতে প্রতিবার নতুন ফোল্ডার তৈরি হয় (Unique ID)
      String monthName = DateFormat('MMM yyyy').format(DateTime.now());
      String uniqueId = "${DateFormat('MMM_yyyy').format(DateTime.now())}_${DateTime.now().millisecondsSinceEpoch}";

      // নতুন মাস সেট করা
      await FirebaseFirestore.instance.collection('messes').doc(messId).update({
        'current_month_id': uniqueId, // এখন আইডি ইউনিক হবে
        'is_month_active': true,
        'meal_rate': 0.0,
      });

      // নতুন মাসের ফোল্ডারে 'created_at' সেভ করা (হিস্ট্রিতে সর্টিংয়ের জন্য)
      await FirebaseFirestore.instance
          .collection('messes').doc(messId)
          .collection('monthly_data').doc(uniqueId)
          .set({
        'created_at': FieldValue.serverTimestamp(),
        'month_name': monthName, // দেখানোর জন্য সুন্দর নাম
        'is_closed': false,
      });

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("New Month Started (Fresh)!")));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  // --- LOGIC 3: LIVE STATS CALCULATION ---
  Future<Map<String, dynamic>> _getMyStats(String messId, String monthId, String uid) async {
    try {
      int totalMeals = 0;
      double totalDeposit = 0.0;
      List<Map<String, String>> historyLog = [];

      // A. Calculate Deposits
      var depSnap = await FirebaseFirestore.instance
          .collection('messes').doc(messId)
          .collection('monthly_data').doc(monthId)
          .collection('deposits')
          .where('member_id', isEqualTo: uid)
          .get();

      for (var doc in depSnap.docs) {
        totalDeposit += (doc['amount'] as num? ?? 0).toDouble();
      }

      // B. Calculate Meals
      var logSnap = await FirebaseFirestore.instance
          .collection('messes').doc(messId)
          .collection('monthly_data').doc(monthId)
          .collection('daily_logs')
          .orderBy(FieldPath.documentId, descending: true)
          .get();

      for (var doc in logSnap.docs) {
        String date = doc.id;
        var data = doc.data();

        Map<dynamic, dynamic> requests = (data['requests'] as Map?) ?? {};

        int dailyCount = 0;
        List<String> statusTexts = [];

        // Helper Function for Counting
        void checkMeal(String type, String statusKey) {
          String status = data[statusKey] ?? 'open';

          if (status != 'closed') {
            bool isOff = false;
            int guestAdd = 0;

            for (var entry in requests.entries) {
              var val = entry.value;
              if (val is Map) {
                if (val['requested_by'] == uid || entry.key == uid) {
                  if (val['type'] == type && val['status'] == 'approved') {
                    if (val['category'] == 'off') isOff = true;
                    if (val['category'] == 'guest') guestAdd += (val['count'] as int? ?? 0);
                  }
                }
              }
            }

            String shortType = type == 'lunch' ? "L" : "D";

            if (!isOff) {
              dailyCount += 1;
              statusTexts.add("$shortType: On");
            } else {
              statusTexts.add("$shortType: Off");
            }

            if (guestAdd > 0) {
              dailyCount += guestAdd;
              statusTexts.add("G(+$guestAdd)");
            }
          }
        }

        checkMeal('lunch', 'lunch_status');
        checkMeal('dinner', 'dinner_status');

        totalMeals += dailyCount;
        historyLog.add({
          'date': date,
          'details': statusTexts.join(" | "),
          'count': dailyCount.toString()
        });
      }

      return {
        'meals': totalMeals,
        'deposit': totalDeposit,
        'history': historyLog
      };

    } catch (e) {
      return {
        'meals': 0,
        'deposit': 0.0,
        'history': [{'date': 'Error', 'details': e.toString(), 'count': '0'}]
      };
    }
  }

  void _showHistoryDialog(BuildContext context, List<Map<String, String>> history) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("My Meal Log"),
        content: SizedBox(
          width: double.maxFinite,
          height: 300,
          child: history.isEmpty
              ? const Center(child: Text("No history available"))
              : ListView.builder(
            itemCount: history.length,
            itemBuilder: (ctx, index) {
              return ListTile(
                dense: true,
                title: Text(history[index]['date']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(history[index]['details']!),
                trailing: CircleAvatar(
                  radius: 15,
                  child: Text(history[index]['count']!, style: const TextStyle(fontSize: 12)),
                ),
              );
            },
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Close"))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('users').doc(user!.uid).snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        var userData = snapshot.data!.data() as Map<String, dynamic>;
        String messId = userData['mess_id'];
        String role = userData['role'];
        String name = userData['name'];

        return StreamBuilder<DocumentSnapshot>(
          stream: FirebaseFirestore.instance.collection('messes').doc(messId).snapshots(),
          builder: (context, messSnap) {
            if (!messSnap.hasData) return const SizedBox();
            var messData = messSnap.data!.data() as Map<String, dynamic>;
            bool isMonthActive = messData['is_month_active'] ?? false;
            String currentMonth = messData['current_month_id'] ?? "";

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  // 1. PROFILE HEADER
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: Colors.blueAccent,
                    child: Text(name.isNotEmpty ? name[0].toUpperCase() : "?", style: const TextStyle(fontSize: 30, color: Colors.white)),
                  ),
                  const SizedBox(height: 10),
                  Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  Text(user.email ?? "", style: const TextStyle(color: Colors.grey)),
                  Chip(label: Text(role.toUpperCase())),

                  const SizedBox(height: 20),

                  // 2. STATS CARD (Running Month)
                  if (isMonthActive)
                    FutureBuilder<Map<String, dynamic>>(
                      future: _getMyStats(messId, currentMonth, user.uid),
                      builder: (context, statSnap) {
                        if (statSnap.connectionState == ConnectionState.waiting) {
                          return const SizedBox(height: 150, child: Center(child: CircularProgressIndicator()));
                        }

                        if (statSnap.hasError) {
                          return Card(
                            color: Colors.red.shade50,
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Text("Error: ${statSnap.error}"),
                            ),
                          );
                        }

                        var stats = statSnap.data!;

                        return Card(
                          color: Colors.blue.shade50,
                          elevation: 2,
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              children: [
                                const Text("Current Month Stats", style: TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 10),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    Column(
                                      children: [
                                        Text("${stats['meals']}", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.orange)),
                                        const Text("Total Meals"),
                                      ],
                                    ),
                                    Container(height: 40, width: 1, color: Colors.grey),
                                    Column(
                                      children: [
                                        Text("৳${stats['deposit']}", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green)),
                                        const Text("Deposited"),
                                      ],
                                    ),
                                  ],
                                ),
                                const Divider(),
                                TextButton.icon(
                                  onPressed: () {
                                    List<Map<String, String>> history =
                                    (stats['history'] as List).map((e) => Map<String, String>.from(e)).toList();
                                    _showHistoryDialog(context, history);
                                  },
                                  icon: const Icon(Icons.list_alt),
                                  label: const Text("View My Meal Log"),
                                )
                              ],
                            ),
                          ),
                        );
                      },
                    )
                  else
                    Card(
                      color: Colors.grey.shade100,
                      child: const Padding(
                        padding: EdgeInsets.all(16.0),
                        child: Text("No Active Month. Wait for Manager to Start.", style: TextStyle(color: Colors.grey)),
                      ),
                    ),

                  const SizedBox(height: 15),

                  // 3. HISTORY BUTTON (For Everyone)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.history_edu, color: Colors.deepPurple),
                      title: const Text("Previous Months History"),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                      onTap: () {
                        // Import: month_history_screen.dart
                        Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => MonthHistoryScreen(messId: messId))
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 4. MANAGER PANEL
                  if (role == 'manager') ...[
                    const Align(alignment: Alignment.centerLeft, child: Text("Manager Controls", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
                    const SizedBox(height: 10),
                    Card(
                      child: Column(
                        children: [
                          // Settings
                          ListTile(
                            leading: const Icon(Icons.timer, color: Colors.blue),
                            title: const Text("Set Meal Timings"),
                            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => MessSettingsScreen(messId: messId)));
                            },
                          ),
                          const Divider(height: 1),

                          // Manage Members
                          ListTile(
                            leading: const Icon(Icons.group, color: Colors.purple),
                            title: const Text("Manage Members"),
                            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(
                                  builder: (_) => MembersScreen(messId: messId, currentUserRole: role)
                              ));
                            },
                          ),
                          const Divider(height: 1),

                          // Start/End Month
                          ListTile(
                            leading: Icon(isMonthActive ? Icons.stop_circle : Icons.play_circle, color: isMonthActive ? Colors.red : Colors.green),
                            title: Text(isMonthActive ? "End & Calculate Month" : "Start New Month"),
                            subtitle: isMonthActive ? const Text("Close current month to start fresh") : const Text("Start zero calculation"),
                            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                            onTap: () {
                              if (!isMonthActive) {
                                _startNewMonth(context, messId);
                              } else {
                                Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) => MonthSummaryScreen(messId: messId, monthId: currentMonth)
                                    )
                                );
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 30),

                  // 5. LOGOUT
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _logout(context),
                      icon: const Icon(Icons.logout, color: Colors.red),
                      label: const Text("Logout", style: TextStyle(color: Colors.red)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}