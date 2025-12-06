import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

class NotificationBadge extends StatelessWidget {
  final String messId;

  const NotificationBadge({super.key, required this.messId});

  @override
  Widget build(BuildContext context) {
    String todayDate = DateFormat('yyyy-MM-dd').format(DateTime.now());

    // 1. Prothome Month ID janar jonne Mess Document ani
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('messes').doc(messId).snapshots(),
      builder: (context, messSnap) {
        if (!messSnap.hasData) return const Icon(Icons.notifications_outlined);

        var messData = messSnap.data!.data() as Map<String, dynamic>;
        bool isMonthActive = messData['is_month_active'] ?? false;
        String monthId = messData['current_month_id'] ?? "";

        if (!isMonthActive || monthId.isEmpty) {
          return const Icon(Icons.notifications_outlined);
        }

        // 2. Month ID peye gele Ajker Log check kori
        return StreamBuilder<DocumentSnapshot>(
          stream: FirebaseFirestore.instance
              .collection('messes').doc(messId)
              .collection('monthly_data').doc(monthId)
              .collection('daily_logs').doc(todayDate)
              .snapshots(),
          builder: (context, logSnap) {
            int pendingCount = 0;

            if (logSnap.hasData && logSnap.data!.exists) {
              var data = logSnap.data!.data() as Map<String, dynamic>;
              var rawRequests = data['requests'] as Map<dynamic, dynamic>? ?? {};

              // 3. Pending Request Guna (Count)
              pendingCount = rawRequests.values
                  .where((req) => req['status'] == 'pending')
                  .length;
            }

            // 4. Jodi Pending thake, Badge dekhao
            return Badge(
              isLabelVisible: pendingCount > 0, // 0 hole dekhabe na
              label: Text(pendingCount.toString()),
              backgroundColor: Colors.red,
              child: Icon(
                pendingCount > 0 ? Icons.notifications_active : Icons.notifications_outlined,
              ),
            );
          },
        );
      },
    );
  }
}