import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

class MealCard extends StatelessWidget {
  final String type; // 'lunch' or 'dinner'
  final Color color;
  final Map<String, dynamic> logData;
  final String role;
  final String messId;
  final String monthId;
  final String date;
  final int totalMembers;
  final String deadline; // Manager er set kora time (Ex: "10:30")

  const MealCard({
    super.key,
    required this.type,
    required this.color,
    required this.logData,
    required this.role,
    required this.messId,
    required this.monthId,
    required this.date,
    required this.totalMembers,
    required this.deadline,
  });

  // --- HELPER: Time Check Logic ---
  bool _isTimeOver() {
    try {
      // Deadline format "HH:mm" (Ex: "14:30")
      final parts = deadline.split(":");
      int limitHour = int.parse(parts[0]);
      int limitMinute = int.parse(parts[1]);

      final now = DateTime.now();
      // Current time ke minutes e convert kori compare korar jonne
      int currentTotalMinutes = now.hour * 60 + now.minute;
      int limitTotalMinutes = limitHour * 60 + limitMinute;

      // Jodi Current Time > Limit hoy, tahole Time Over
      return currentTotalMinutes > limitTotalMinutes;
    } catch (e) {
      // Jodi deadline set na thake ba format vul hoy, safe side e false return kori
      return false;
    }
  }

  // --- HELPER: Display Time (AM/PM) ---
  String _formatTimeDisplay(String time24) {
    try {
      final parts = time24.split(":");
      final dt = DateTime(2022, 1, 1, int.parse(parts[0]), int.parse(parts[1]));
      return DateFormat('h:mm a').format(dt); // Ex: 10:30 AM
    } catch (e) {
      return time24;
    }
  }

  // --- LOGIC: MEAL OFF REQUEST ---
  Future<void> _requestMealOff(BuildContext context) async {
    final user = FirebaseAuth.instance.currentUser;
    try {
      await FirebaseFirestore.instance
          .collection('messes').doc(messId)
          .collection('monthly_data').doc(monthId)
          .collection('daily_logs').doc(date)
          .set({
        'requests': {
          user!.uid: {
            'name': user.displayName ?? "Member",
            'type': type,
            'category': 'off',
            'status': 'pending',
            'timestamp': DateTime.now(),
          }
        }
      }, SetOptions(merge: true));

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$type Off Requested!")));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  // --- LOGIC: GUEST MEAL REQUEST ---
  Future<void> _requestGuestMeal(BuildContext context) async {
    final user = FirebaseAuth.instance.currentUser;
    final guestCountController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text("Add Guest for ${type.toUpperCase()}"),
        content: TextField(
          controller: guestCountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
              labelText: "Number of Guests",
              hintText: "Ex: 1, 2",
              border: OutlineInputBorder()
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (guestCountController.text.isNotEmpty) {
                int count = int.parse(guestCountController.text);
                Navigator.pop(ctx);

                // Unique Key generate korsi jate ekjon member multiple guest add korte pare
                String uniqueKey = '${user!.uid}_guest_${DateTime.now().millisecondsSinceEpoch}';

                await FirebaseFirestore.instance
                    .collection('messes').doc(messId)
                    .collection('monthly_data').doc(monthId)
                    .collection('daily_logs').doc(date)
                    .set({
                  'requests': {
                    uniqueKey: {
                      'name': "${user.displayName} (Guest)",
                      'type': type,
                      'category': 'guest',
                      'count': count,
                      'status': 'pending',
                      'requested_by': user.uid,
                      'timestamp': DateTime.now(),
                    }
                  }
                }, SetOptions(merge: true));

                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Guest Request Sent!")));
              }
            },
            child: const Text("Send Request"),
          )
        ],
      ),
    );
  }

  // --- MANAGER LOGIC: FORCE STOP (Optional) ---
  // Manager chaile time er ageo manual stop korte pare
  Future<void> _managerStopCooking(BuildContext context) async {
    await FirebaseFirestore.instance
        .collection('messes').doc(messId)
        .collection('monthly_data').doc(monthId)
        .collection('daily_logs').doc(date)
        .set({
      '${type}_status': 'cooking'
    }, SetOptions(merge: true));
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    // Status Logic
    String status = logData['${type}_status'] ?? 'open';
    int count = logData['${type}_count'] ?? 0;

    // Time Check
    bool timeOver = _isTimeOver();

    // Check if I already requested OFF
    // Note: Guest requests multiple hote pare, tai ota check korchi na, shudhu OFF check korchi
    var rawRequests = logData['requests'] as Map<dynamic, dynamic>? ?? {};
    var myRequest = rawRequests[user!.uid]; // OFF request user ID diye save hoy
    bool iRequestedOff = myRequest != null && myRequest['type'] == type && myRequest['category'] == 'off';
    String myRequestStatus = iRequestedOff ? myRequest['status'] : '';

    // UI Variables
    bool isActionDisabled = status == 'cooking' || timeOver;

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: color, width: 8)),
          color: Colors.white,
        ),
        child: Column(
          children: [
            // --- HEADER ---
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(type.toUpperCase(), style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
                    // Time Warning Text
                    Text(
                      timeOver ? "Time Over" : "Order before: ${_formatTimeDisplay(deadline)}",
                      style: TextStyle(
                          fontSize: 12,
                          color: timeOver ? Colors.red : Colors.grey[700],
                          fontWeight: timeOver ? FontWeight.bold : FontWeight.normal
                      ),
                    ),
                  ],
                ),
                Chip(
                  label: Text(status.toUpperCase()),
                  backgroundColor: status == 'cooking' ? Colors.green.shade100 : Colors.blue.shade50,
                )
              ],
            ),
            const SizedBox(height: 10),

            // --- COUNT DISPLAY ---
            if (status == 'cooking')
              Text("Final Count: $count", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green))
            else
              Text("Current Count: $count", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),

            const SizedBox(height: 5),
            const Text("Meals", style: TextStyle(color: Colors.grey)),

            const Divider(),

            // --- ACTION BUTTONS ---
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // 1. MEAL OFF BUTTON
                Expanded(
                  child: OutlinedButton(
                    onPressed: (isActionDisabled || iRequestedOff)
                        ? null
                        : () => _requestMealOff(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                    ),
                    child: Text(iRequestedOff ? "Status: $myRequestStatus" : "OFF (-1)"),
                  ),
                ),

                const SizedBox(width: 10),

                // 2. GUEST MEAL BUTTON
                Expanded(
                  child: OutlinedButton(
                    onPressed: isActionDisabled
                        ? null
                        : () => _requestGuestMeal(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.green,
                      side: const BorderSide(color: Colors.green),
                    ),
                    child: const Text("Guest (+)"),
                  ),
                ),

                // 3. MANAGER MANUAL STOP (Optional)
                if (role == 'manager' && status == 'open')
                  IconButton(
                    icon: const Icon(Icons.lock, color: Colors.grey),
                    tooltip: "Force Stop Cooking",
                    onPressed: () => _managerStopCooking(context),
                  )
              ],
            )
          ],
        ),
      ),
    );
  }
}