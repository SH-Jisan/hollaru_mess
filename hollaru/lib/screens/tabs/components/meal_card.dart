import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

class MealCard extends StatelessWidget {
  final String type;
  final Color color;
  final Map<String, dynamic> logData;
  final String role;
  final String messId;
  final String monthId;
  final String date;
  final int totalMembers;
  final String startTime;
  final String endTime;

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
    required this.startTime,
    required this.endTime,
  });

  // --- UNIVERSAL CYCLE LOGIC ---
  int _getTimeStatus() {
    try {
      DateTime now = DateTime.now();
      DateTime mealDate = DateTime.parse(date); // Target Meal Date (Example: 8th)

      // 1. WINDOW START (সব সময় আগের দিন)
      // Example: 8 তারিখের মিলের জন্য সাইকেল শুরু হবে 7 তারিখ বিকাল ৫টায়
      List<String> startParts = startTime.split(":");
      DateTime windowStart = DateTime(
          mealDate.year, mealDate.month, mealDate.day - 1,
          int.parse(startParts[0]), int.parse(startParts[1])
      );

      // 2. DEADLINE CALCULATION (Smart Cycle Check)
      List<String> endParts = endTime.split(":");
      int endHour = int.parse(endParts[0]);
      int endMinute = int.parse(endParts[1]);

      // প্রথমে ধরে নেই ডেডলাইনটি আগের দিনেই (7 তারিখ)
      DateTime calculatedDeadline = DateTime(
          mealDate.year, mealDate.month, mealDate.day - 1,
          endHour, endMinute
      );

      // চেক: যদি দেখি ডেডলাইনটি "Window Start" এর আগেই পড়ে গেছে,
      // তার মানে এটি আসলে পরের দিনের (8 তারিখের) সময়।
      // Example: Start 17:00 (5 PM). Deadline 02:00 (2 AM).
      // 7th 2 AM < 7th 5 PM. তাই এটি হবে 8th 2 AM.
      if (calculatedDeadline.isBefore(windowStart)) {
        calculatedDeadline = calculatedDeadline.add(const Duration(days: 1));
      }

      // 3. Comparison
      if (now.isBefore(windowStart)) return 1; // Too Early (সাইকেল শুরু হয়নি)
      if (now.isAfter(calculatedDeadline)) return 2; // Time Over (ডেডলাইন পার)

      return 0; // Open
    } catch (e) {
      return 0;
    }
  }

  // --- HELPER: Display Time ---
  String _formatTime(String time24) {
    try {
      final parts = time24.split(":");
      final dt = DateTime(2022, 1, 1, int.parse(parts[0]), int.parse(parts[1]));
      return DateFormat('h:mm a').format(dt);
    } catch (e) {
      return time24;
    }
  }

  // --- DB ACTIONS (Same as before) ---
  Future<void> _requestMealOff(BuildContext context) async {
    final user = FirebaseAuth.instance.currentUser;
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
  }

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
          decoration: const InputDecoration(labelText: "Number of Guests"),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (guestCountController.text.isNotEmpty) {
                int count = int.parse(guestCountController.text);
                Navigator.pop(ctx);
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
            child: const Text("Send"),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    int count = logData['${type}_count'] ?? 0;

    // Time Check
    int timeState = _getTimeStatus();

    // UI Variables
    String displayStatus = "OPEN";
    Color chipColor = Colors.blue;
    bool isLocked = false;
    String infoText = "";
    Color infoColor = Colors.grey;

    // Deadline Display Logic (UI তে দেখানোর জন্য)
    String endDisplay = _formatTime(endTime);
    // UI তেও লজিক অ্যাপ্লাই করে দেখাবো "Prev Day" কিনা
    try {
      List<String> startParts = startTime.split(":");
      List<String> endParts = endTime.split(":");
      // যদি End Hour < Start Hour হয়, তবে এটি পরের দিন (Same Day of Meal)
      // যদি End Hour > Start Hour হয় (যেমন রাত ৮টা), তবে এটি আগের দিন (Prev Day)
      if (int.parse(endParts[0]) > int.parse(startParts[0])) {
        endDisplay = "Prev Day $endDisplay";
      }
    } catch (_) {}


    if (timeState == 1) {
      // Too Early
      infoText = "Starts: Prev Day ${_formatTime(startTime)}";
      infoColor = Colors.orange;
      displayStatus = "WAITING";
      chipColor = Colors.orange;
      isLocked = true;
    } else if (timeState == 2) {
      // Time Over
      infoText = "Closed (Ended $endDisplay)";
      infoColor = Colors.red;
      displayStatus = "COOKING";
      chipColor = Colors.green;
      isLocked = true;
    } else {
      // Open
      infoText = "Open until $endDisplay";
      infoColor = Colors.green;
      displayStatus = "OPEN";
      chipColor = Colors.blue;
      isLocked = false;
    }

    var rawRequests = logData['requests'] as Map<dynamic, dynamic>? ?? {};
    var myRequest = rawRequests[user!.uid];
    bool iRequestedOff = myRequest != null && myRequest['type'] == type && myRequest['category'] == 'off';
    String myRequestStatus = iRequestedOff ? myRequest['status'] : '';

    bool isActionDisabled = isLocked;

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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(type.toUpperCase(), style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
                      Text(
                        infoText,
                        style: TextStyle(fontSize: 12, color: infoColor, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Chip(
                  label: Text(displayStatus),
                  backgroundColor: chipColor.withOpacity(0.1),
                  labelStyle: TextStyle(color: chipColor, fontWeight: FontWeight.bold),
                )
              ],
            ),
            const SizedBox(height: 10),

            // COUNT DISPLAY
            Text(
                isLocked ? "Final Count: $count" : "Current Count: $count",
                style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: isLocked ? Colors.green : Colors.black
                )
            ),

            const Divider(),

            // BUTTONS
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: (isActionDisabled || iRequestedOff) ? null : () => _requestMealOff(context),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                    child: Text(iRequestedOff ? "$myRequestStatus" : "OFF (-1)"),
                  ),
                ),
                const SizedBox(width: 10),

                Expanded(
                  child: OutlinedButton(
                    onPressed: isActionDisabled ? null : () => _requestGuestMeal(context),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.green),
                    child: const Text("Guest (+)"),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}