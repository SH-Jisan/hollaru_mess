import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'components/meal_card.dart';

class MealTab extends StatefulWidget {
  const MealTab({super.key});

  @override
  State<MealTab> createState() => _MealTabState();
}

class _MealTabState extends State<MealTab> {
  final user = FirebaseAuth.instance.currentUser;
  String get todayDate => DateFormat('yyyy-MM-dd').format(DateTime.now());

  // --- HELPER: Initialize Today's Data (Auto Start) ---
  Future<void> _initializeTodayData(String messId, String monthId, int totalMembers) async {
    final docRef = FirebaseFirestore.instance
        .collection('messes').doc(messId)
        .collection('monthly_data').doc(monthId)
        .collection('daily_logs').doc(todayDate);

    final docSnapshot = await docRef.get();

    // Jodi Ajker Data na thake, tahole create koro (Default Count = Total Members)
    if (!docSnapshot.exists) {
      await docRef.set({
        'lunch_count': totalMembers, // Sobai khabe by default
        'dinner_count': totalMembers,
        'lunch_status': 'open', // Automatic Started
        'dinner_status': 'open',
        'requests': {}, // Empty requests
      });
    }
  }

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

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: _getMessInfo(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        if (snapshot.data == null) return const Center(child: Text("Please start a month first."));

        String messId = snapshot.data!['mess_id'];
        String monthId = snapshot.data!['month_id'];
        String role = snapshot.data!['role'];

        return StreamBuilder<DocumentSnapshot>(
          stream: FirebaseFirestore.instance.collection('messes').doc(messId).snapshots(),
          builder: (context, messSnap) {
            if(!messSnap.hasData) return const SizedBox();
            var messData = messSnap.data!.data() as Map<String, dynamic>;
            List members = messData['members'] ?? [];

            // --- NEW: FETCH DEADLINES ---
            // Database e "HH:mm" format e ache (Ex: "10:30")
            String lunchLimit = messData['lunch_deadline'] ?? "2:00"; // Default 2 AM
            String dinnerLimit = messData['dinner_deadline'] ?? "13:00"; // Default 1 PM

            // --- AUTO START CHECK ---
            // Protibar build howar somoy check korbe ajker data ache kina
            _initializeTodayData(messId, monthId, members.length);

            return StreamBuilder<DocumentSnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('messes').doc(messId)
                  .collection('monthly_data').doc(monthId)
                  .collection('daily_logs').doc(todayDate)
                  .snapshots(),
              builder: (context, logSnap) {

                // Safe Data Handling
                Map<String, dynamic> logData = (logSnap.hasData && logSnap.data!.exists)
                    ? logSnap.data!.data() as Map<String, dynamic>
                    : <String, dynamic>{
                  'lunch_count': members.length,
                  'dinner_count': members.length
                }; // UI te jate jhamela na hoy

                return Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Text("Date: $todayDate", style: const TextStyle(fontSize: 18, color: Colors.grey)),
                      const SizedBox(height: 20),

                      MealCard(
                          type: "lunch",
                          deadline: lunchLimit,
                          color: Colors.orange,
                          logData: logData,
                          role: role,
                          messId: messId,
                          monthId: monthId,
                          date: todayDate,
                          totalMembers: members.length
                      ),

                      const SizedBox(height: 20),

                      MealCard(
                          type: "dinner",
                          deadline: dinnerLimit,
                          color: Colors.purple,
                          logData: logData,
                          role: role,
                          messId: messId,
                          monthId: monthId,
                          date: todayDate,
                          totalMembers: members.length
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}