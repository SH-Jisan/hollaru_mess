import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

class RequestsTab extends StatefulWidget {
  const RequestsTab({super.key});

  @override
  State<RequestsTab> createState() => _RequestsTabState();
}

class _RequestsTabState extends State<RequestsTab> {
  final user = FirebaseAuth.instance.currentUser;

  // Ajker Date ber kora
  String get todayDate => DateFormat('yyyy-MM-dd').format(DateTime.now());

  // --- HELPER: Mess Info Ana ---
  Future<Map<String, dynamic>?> _getMessInfo() async {
    var userDoc = await FirebaseFirestore.instance.collection('users').doc(user!.uid).get();
    if (!userDoc.exists) return null;

    String messId = userDoc['mess_id'] ?? "";
    String role = userDoc['role'] ?? "member";

    if (messId.isEmpty) return null;

    var messDoc = await FirebaseFirestore.instance.collection('messes').doc(messId).get();
    if (!messDoc.exists || !(messDoc['is_month_active'] ?? false)) return null;

    return {'mess_id': messId, 'month_id': messDoc['current_month_id'], 'role': role};
  }

  // --- CORE LOGIC: APPROVE REQUEST ---
  // Eta Meal Off (-1) abong Guest Meal (+X) duita case handle korbe
  Future<void> _approveRequest(String messId, String monthId, String reqKey, String type, String category, int guestCount) async {
    final docRef = FirebaseFirestore.instance
        .collection('messes').doc(messId)
        .collection('monthly_data').doc(monthId)
        .collection('daily_logs').doc(todayDate);

    try {
      await FirebaseFirestore.instance.runTransaction((transaction) async {
        DocumentSnapshot snapshot = await transaction.get(docRef);
        if (!snapshot.exists) return;

        // 1. Request Status Update kora (Pending -> Approved)
        transaction.update(docRef, {
          'requests.$reqKey.status': 'approved'
        });

        // 2. Meal Count Update kora
        String fieldName = '${type}_count'; // lunch_count ba dinner_count
        int currentCount = snapshot.get(fieldName);

        if (category == 'guest') {
          // Case A: Guest hole Count BARBE (+)
          transaction.update(docRef, {
            fieldName: currentCount + guestCount
          });
        } else {
          // Case B: Meal Off hole Count KOMBE (-)
          transaction.update(docRef, {
            fieldName: currentCount - 1
          });
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Request Approved & Count Updated!"))
      );

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red)
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: _getMessInfo(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        if (snapshot.data == null) return const Center(child: Text("No active month found."));

        String messId = snapshot.data!['mess_id'];
        String monthId = snapshot.data!['month_id'];
        String role = snapshot.data!['role'];

        // Shudhu Manager Access Pabe
        if (role != 'manager') {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.security, size: 60, color: Colors.grey),
                SizedBox(height: 10),
                Text("Only Manager can manage requests", style: TextStyle(color: Colors.grey)),
              ],
            ),
          );
        }

        return DefaultTabController(
          length: 2,
          child: Scaffold(
            appBar: AppBar(
              toolbarHeight: 0, // Appbar hide kore shudhu TabBar dekhabo
              bottom: const TabBar(
                indicatorColor: Colors.blueAccent,
                labelColor: Colors.blueAccent,
                tabs: [
                  Tab(icon: Icon(Icons.sunny), text: "Lunch Requests"),
                  Tab(icon: Icon(Icons.nightlight_round), text: "Dinner Requests"),
                ],
              ),
            ),
            body: TabBarView(
              children: [
                _buildRequestList(messId, monthId, 'lunch'),
                _buildRequestList(messId, monthId, 'dinner'),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- LIST BUILDER ---
  Widget _buildRequestList(String messId, String monthId, String type) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance
          .collection('messes').doc(messId)
          .collection('monthly_data').doc(monthId)
          .collection('daily_logs').doc(todayDate)
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData || !snapshot.data!.exists) {
          return const Center(child: Text("No requests today."));
        }

        var data = snapshot.data!.data() as Map<String, dynamic>;

        // Safe Map Casting
        var rawRequests = data['requests'] as Map<dynamic, dynamic>? ?? {};

        // Filter: Shudhu specific type er request (lunch ba dinner)
        var requests = rawRequests.entries
            .where((e) => e.value['type'] == type)
            .toList();

        if (requests.isEmpty) {
          return Center(child: Text("No ${type.toUpperCase()} requests found."));
        }

        return ListView.builder(
          itemCount: requests.length,
          padding: const EdgeInsets.all(16),
          itemBuilder: (context, index) {
            String reqKey = requests[index].key.toString();
            var reqData = requests[index].value as Map<dynamic, dynamic>;

            bool isApproved = reqData['status'] == 'approved';
            String category = reqData['category'] ?? 'off'; // 'guest' ba 'off'
            int count = reqData['count'] ?? 1; // Guest count

            // Card Color Logic
            Color cardColor;
            if (isApproved) {
              cardColor = Colors.grey.shade200; // Approved hole Grey
            } else if (category == 'guest') {
              cardColor = Colors.blue.shade50; // Guest hole Blue
            } else {
              cardColor = Colors.orange.shade50; // Meal Off hole Orange
            }

            return Card(
              color: cardColor,
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: isApproved
                      ? Colors.grey
                      : (category == 'guest' ? Colors.blue : Colors.orange),
                  child: Icon(
                    category == 'guest' ? Icons.person_add : Icons.no_food,
                    color: Colors.white,
                  ),
                ),
                title: Text(reqData['name'] ?? "Unknown"),
                subtitle: Text(category == 'guest'
                    ? "Added $count Guest(s)"
                    : "Wants to turn OFF meal"),

                trailing: isApproved
                    ? const Chip(
                    label: Text("Done"),
                    backgroundColor: Colors.transparent,
                    avatar: Icon(Icons.check, color: Colors.green)
                )
                    : ElevatedButton(
                  onPressed: () => _approveRequest(messId, monthId, reqKey, type, category, count),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white
                  ),
                  // Button e Dynamic Text dekhabe
                  child: Text(category == 'guest' ? "Add (+$count)" : "Off (-1)"),
                ),
              ),
            );
          },
        );
      },
    );
  }
}