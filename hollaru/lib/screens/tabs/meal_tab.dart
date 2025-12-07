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

  // Date Handling
  DateTime _selectedDate = DateTime.now();
  bool _isDateInitialized = false;

  String get formattedDate => DateFormat('yyyy-MM-dd').format(_selectedDate);

  // --- LIMIT CHECKERS ---
  bool get isTomorrow {
    final now = DateTime.now();
    final tomorrow = now.add(const Duration(days: 1));
    return _selectedDate.year == tomorrow.year &&
        _selectedDate.month == tomorrow.month &&
        _selectedDate.day == tomorrow.day;
  }

  // --- INIT DATA IF NOT EXISTS ---
  Future<void> _initializeDataForDate(String messId, String monthId, int totalMembers) async {
    final docRef = FirebaseFirestore.instance
        .collection('messes').doc(messId)
        .collection('monthly_data').doc(monthId)
        .collection('daily_logs').doc(formattedDate);

    final docSnapshot = await docRef.get();

    // যদি ডেটা না থাকে, ডিফল্ট ভ্যালু সেট করো
    if (!docSnapshot.exists) {
      await docRef.set({
        'lunch_count': totalMembers,
        'dinner_count': totalMembers,
        'lunch_status': 'open',
        'dinner_status': 'open',
        'requests': {},
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

            // Times
            String reqStart = messData['request_start_time'] ?? "17:00";
            String lEnd = messData['lunch_end_time'] ?? "02:00";
            String dEnd = messData['dinner_end_time'] ?? "12:00";

            // --- SMART DATE SWITCHER (Run only once) ---
            if (!_isDateInitialized) {
              TimeOfDay now = TimeOfDay.now();
              List<String> parts = reqStart.split(":");
              TimeOfDay startLimit = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));

              int nowMin = now.hour * 60 + now.minute;
              int startMin = startLimit.hour * 60 + startLimit.minute;

              // যদি বর্তমান সময় > Request Start Time হয় (যেমন বিকাল ৫টার পর)
              // তাহলে অটোমেটিক পরের দিনের ডেটা দেখাবে
              if (nowMin >= startMin) {
                _selectedDate = DateTime.now().add(const Duration(days: 1));
              } else {
                _selectedDate = DateTime.now();
              }
              _isDateInitialized = true;
            }
            // -------------------------------------------

            _initializeDataForDate(messId, monthId, members.length);

            return StreamBuilder<DocumentSnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('messes').doc(messId)
                    .collection('monthly_data').doc(monthId)
                    .collection('daily_logs').doc(formattedDate)
                    .snapshots(),
                builder: (context, logSnap) {
                  Map<String, dynamic> logData = (logSnap.hasData && logSnap.data!.exists)
                      ? logSnap.data!.data() as Map<String, dynamic>
                      : <String, dynamic>{
                    'lunch_count': members.length,
                    'dinner_count': members.length,
                    'lunch_status': 'open',
                    'dinner_status': 'open'
                  };

                  return Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        // --- RESTRICTED DATE NAVIGATOR ---
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 15),
                          decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [BoxShadow(color: Colors.grey.shade200, blurRadius: 5)]
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // PREVIOUS BUTTON (সব সময় কাজ করবে, পুরোনো ডেটা দেখার জন্য)
                              IconButton(
                                icon: const Icon(Icons.arrow_back_ios, size: 20),
                                onPressed: () {
                                  setState(() {
                                    _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                                  });
                                },
                              ),

                              // DATE TEXT
                              Text(
                                DateFormat('EEE, dd MMM').format(_selectedDate),
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blueAccent),
                              ),

                              // NEXT BUTTON (লজিক: আগামীকাল হলে বাটন গায়েব বা ডিসেবল হয়ে যাবে)
                              IconButton(
                                icon: Icon(Icons.arrow_forward_ios, size: 20, color: isTomorrow ? Colors.grey : Colors.black),
                                onPressed: isTomorrow
                                    ? null // যদি আগামীকাল হয়, বাটন কাজ করবে না
                                    : () {
                                  setState(() {
                                    _selectedDate = _selectedDate.add(const Duration(days: 1));
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        // ---------------------------------

                        MealCard(
                            type: "lunch",
                            startTime: reqStart,
                            endTime: lEnd,
                            color: Colors.orange,
                            logData: logData, role: role, messId: messId, monthId: monthId,
                            date: formattedDate, totalMembers: members.length
                        ),

                        const SizedBox(height: 20),

                        MealCard(
                            type: "dinner",
                            startTime: reqStart,
                            endTime: dEnd,
                            color: Colors.purple,
                            logData: logData, role: role, messId: messId, monthId: monthId,
                            date: formattedDate, totalMembers: members.length
                        ),
                      ],
                    ),
                  );
                }
            );
          },
        );
      },
    );
  }
}