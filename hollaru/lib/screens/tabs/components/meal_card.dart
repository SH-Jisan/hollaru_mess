import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

import '../../../services/notification_service.dart';

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

  // --- TIME STATUS ---
  int _getTimeStatus() {
    try {
      DateTime now = DateTime.now();
      DateTime mealDate = DateTime.parse(date);

      // Start Time (Previous Day)
      List<String> startParts = startTime.split(":");
      DateTime windowStart = DateTime(
          mealDate.year, mealDate.month, mealDate.day - 1,
          int.parse(startParts[0]), int.parse(startParts[1])
      );

      // End Time (Smart Logic)
      List<String> endParts = endTime.split(":");
      int endHour = int.parse(endParts[0]);
      int endMinute = int.parse(endParts[1]);
      DateTime windowEnd;

      if (type == 'lunch' && endHour >= 15) {
        windowEnd = DateTime(mealDate.year, mealDate.month, mealDate.day - 1, endHour, endMinute);
      } else {
        windowEnd = DateTime(mealDate.year, mealDate.month, mealDate.day, endHour, endMinute);
      }

      if (now.isBefore(windowStart)) return 1; // Waiting
      if (now.isAfter(windowEnd)) return 2;    // Time Over
      return 0; // Open
    } catch (e) {
      return 0;
    }
  }

  String _formatTime(String time24) {
    try {
      final parts = time24.split(":");
      final dt = DateTime(2022, 1, 1, int.parse(parts[0]), int.parse(parts[1]));
      return DateFormat('h:mm a').format(dt);
    } catch (e) {
      return time24;
    }
  }

  // --- DB ACTIONS ---
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

  // --- CANCEL MEAL (MEMBER/MANAGER BOTH) ---
  Future<void> _reportNoMeal(BuildContext context, String currentStatus) async {
    final user = FirebaseAuth.instance.currentUser;
    // নাম বের করার জন্য ইউজার প্রোফাইল থেকে ডিসপ্লে নেম নেওয়া ভালো,
    // তবে এখানে শর্টকাটে FirebaseAuth এর নাম নিচ্ছি।
    String reporterName = user?.displayName ?? "A Member";

    // যদি অলরেডি ক্লোজ থাকে, তবে কেবল ম্যানেজার খুলতে পারবে
    if (currentStatus == 'closed' && role != 'manager') {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Only Manager can re-open meal.")));
      return;
    }

    String newStatus = currentStatus == 'closed' ? 'open' : 'closed';

    bool confirm = await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(newStatus == 'closed' ? "Report NO MEAL?" : "Re-open Meal?"),
          content: Text(newStatus == 'closed'
              ? "Everyone will be notified that meal is cancelled by YOU ($reporterName)."
              : "Meal will be active again."),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("No")),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: newStatus == 'closed' ? Colors.red : Colors.green, foregroundColor: Colors.white),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text("Yes, Update"),
            )
          ],
        )
    ) ?? false;

    if (confirm) {
      await FirebaseFirestore.instance
          .collection('messes').doc(messId)
          .collection('monthly_data').doc(monthId)
          .collection('daily_logs').doc(date)
          .set({
        '${type}_status': newStatus,
        if(newStatus == 'closed') '${type}_count': 0,
        // কে ক্যান্সেল করল তার নাম সেভ করছি
        if(newStatus == 'closed') '${type}_cancelled_by': reporterName
      }, SetOptions(merge: true));
      String notifBody = newStatus == 'closed'
          ? "Alert! $type has been CANCELLED by $reporterName."
          : "Update: $type has been RE-OPENED.";

      await NotificationService.sendPushNotification(
          messId: messId,
          title: "Meal Update 📢",
          body: notifBody
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    // DB Status
    String status = logData['${type}_status'] ?? 'open';
    int count = logData['${type}_count'] ?? 0;
    String cancelledBy = logData['${type}_cancelled_by'] ?? "Manager"; // কে ক্যান্সেল করেছে

    // Time Logic
    int timeState = _getTimeStatus();

    // UI Variables
    String displayStatus = "OPEN";
    Color chipColor = Colors.blue;
    bool isLocked = false;
    String infoText = "";
    Color infoColor = Colors.grey;

    // --- PRIORITY LOGIC ---
    if (status == 'closed') {
      displayStatus = "CANCELLED";
      chipColor = Colors.red;
      // এখানে দেখাবে কে বন্ধ করেছে
      infoText = "Cancelled by: $cancelledBy";
      infoColor = Colors.red;
      isLocked = true;
    }
    else if (timeState == 2) {
      displayStatus = "COOKING";
      chipColor = Colors.green;
      infoText = "Auto-Locked (Ended ${_formatTime(endTime)})";
      infoColor = Colors.green;
      isLocked = true;
    }
    else if (timeState == 1) {
      displayStatus = "WAITING";
      chipColor = Colors.orange;
      infoText = "Starts: Prev Day ${_formatTime(startTime)}";
      infoColor = Colors.orange;
      isLocked = true;
    }
    else {
      displayStatus = "OPEN";
      chipColor = Colors.blue;
      infoText = "Open until ${_formatTime(endTime)}";
      infoColor = Colors.green;
      isLocked = false;
    }

    var rawRequests = logData['requests'] as Map<dynamic, dynamic>? ?? {};
    var myRequest = rawRequests[user!.uid];
    bool iRequestedOff = myRequest != null && myRequest['type'] == type && myRequest['category'] == 'off';
    String myRequestStatus = iRequestedOff ? myRequest['status'] : '';

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

            Text(
                status == 'closed' ? "Meal Off" : (isLocked ? "Final Count: $count" : "Current Count: $count"),
                style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: status == 'closed' ? Colors.red : (isLocked ? Colors.green : Colors.black)
                )
            ),

            const Divider(),

            // BUTTONS
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // 1. OFF BUTTON
                Expanded(
                  child: OutlinedButton(
                    onPressed: (isLocked || iRequestedOff) ? null : () => _requestMealOff(context),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                    child: Text(iRequestedOff ? "$myRequestStatus" : "OFF (-1)"),
                  ),
                ),
                const SizedBox(width: 10),

                // 2. GUEST BUTTON
                Expanded(
                  child: OutlinedButton(
                    onPressed: isLocked ? null : () => _requestGuestMeal(context),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.green),
                    child: const Text("Guest (+)"),
                  ),
                ),

                // 3. REPORT/CANCEL BUTTON (FOR EVERYONE)
                // মিল চালু থাকলে বাটনটি দেখাবে (যাতে মেম্বাররা বন্ধ করতে পারে)
                // মিল বন্ধ থাকলে শুধুমাত্র ম্যানেজার বাটনটি দেখবে (চালু করার জন্য)
                if (status != 'closed' || role == 'manager')
                  IconButton(
                    icon: Icon(
                        status == 'closed' ? Icons.settings_backup_restore : Icons.warning_amber_rounded,
                        color: status == 'closed' ? Colors.green : Colors.orange
                    ),
                    tooltip: status == 'closed' ? "Re-open Meal" : "Report No Meal",
                    onPressed: () => _reportNoMeal(context, status),
                  )
              ],
            )
          ],
        ),
      ),
    );
  }
}