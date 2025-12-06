import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class ManagerSheet extends StatelessWidget {
  final String messId;
  final String monthId;
  final String date;
  final String type; // 'lunch' or 'dinner'
  final int totalMembers;

  const ManagerSheet({
    super.key,
    required this.messId,
    required this.monthId,
    required this.date,
    required this.type,
    required this.totalMembers,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance
          .collection('messes').doc(messId)
          .collection('monthly_data').doc(monthId)
          .collection('daily_logs').doc(date)
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData || !snapshot.data!.exists) {
          return const Center(child: Padding(
            padding: EdgeInsets.all(20.0),
            child: Text("No requests found for today."),
          ));
        }

        var data = snapshot.data!.data() as Map<String, dynamic>;
        // Map Casting Fix
        var rawRequests = data['requests'] as Map<dynamic, dynamic>? ?? {};

        // Filter requests based on type (lunch/dinner)
        var myTypeRequests = rawRequests.entries
            .where((e) => e.value['type'] == type)
            .toList();

        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("${type.toUpperCase()} Management", style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),

              // 1. Request List
              Expanded(
                child: myTypeRequests.isEmpty
                    ? const Center(child: Text("No 'Meal Off' requests."))
                    : ListView.builder(
                  itemCount: myTypeRequests.length,
                  itemBuilder: (context, index) {
                    var req = myTypeRequests[index].value as Map<dynamic, dynamic>;
                    String uid = myTypeRequests[index].key.toString();
                    bool isApproved = req['status'] == 'approved';

                    return ListTile(
                      title: Text(req['name'] ?? "Unknown"),
                      subtitle: Text("Status: ${req['status']}"),
                      trailing: isApproved
                          ? const Icon(Icons.check_circle, color: Colors.green)
                          : ElevatedButton(
                        child: const Text("Approve"),
                        onPressed: () async {
                          await FirebaseFirestore.instance
                              .collection('messes').doc(messId)
                              .collection('monthly_data').doc(monthId)
                              .collection('daily_logs').doc(date)
                              .update({
                            'requests.$uid.status': 'approved'
                          });
                        },
                      ),
                    );
                  },
                ),
              ),

              // 2. Start Cooking Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                  icon: const Icon(Icons.soup_kitchen),
                  label: Text("Start Cooking ($type)"),
                  onPressed: () async {
                    int approvedOffs = myTypeRequests.where((e) => e.value['status'] == 'approved').length;
                    int finalCount = totalMembers - approvedOffs;

                    // Save Count
                    await FirebaseFirestore.instance
                        .collection('messes').doc(messId)
                        .collection('monthly_data').doc(monthId)
                        .collection('daily_logs').doc(date)
                        .set({
                      '${type}_count': finalCount,
                      '${type}_status': 'cooking'
                    }, SetOptions(merge: true));

                    // Update Total Month Meals
                    await FirebaseFirestore.instance
                        .collection('messes').doc(messId)
                        .collection('monthly_data').doc(monthId)
                        .update({
                      'total_meals': FieldValue.increment(finalCount)
                    });

                    if (!context.mounted) return;
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$type Started with $finalCount meals!")));
                  },
                ),
              )
            ],
          ),
        );
      },
    );
  }
}