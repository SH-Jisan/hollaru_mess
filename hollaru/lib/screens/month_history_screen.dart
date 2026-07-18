import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import 'month_summary_screen.dart'; // রিপোর্ট দেখার জন্য আগের স্ক্রিনটিই ব্যবহার করব

class MonthHistoryScreen extends StatelessWidget {
  final String messId;

  const MonthHistoryScreen({super.key, required this.messId});

  String _formatTimestamp(Timestamp? timestamp) {
    if (timestamp == null) return "Unknown Date";
    return DateFormat('dd MMM yyyy, hh:mm a').format(timestamp.toDate());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Previous Months History")),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('messes').doc(messId)
            .collection('monthly_data')
            .orderBy('created_at', descending: true) // লেটেস্ট মাস আগে দেখাবে
            .snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          var docs = snapshot.data!.docs;

          if (docs.isEmpty) {
            return const Center(child: Text("No history found."));
          }

          return ListView.builder(
            itemCount: docs.length,
            itemBuilder: (context, index) {
              var data = docs[index].data() as Map<String, dynamic>;
              String monthId = docs[index].id;

              // সুন্দর নাম (যদি সেভ করা থাকে) অথবা আইডি থেকে বের করা
              String displayName = data['month_name'] ?? monthId.split('_')[0] + " " + monthId.split('_')[1];
              bool isClosed = data['is_month_active'] == false || (data.containsKey('meal_rate') && data['meal_rate'] > 0);
              String createdDate = _formatTimestamp(data['created_at']);

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isClosed ? Colors.grey : Colors.green,
                    child: Icon(isClosed ? Icons.history : Icons.play_arrow, color: Colors.white),
                  ),
                  title: Text(displayName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("Started: $createdDate"),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {
                    // ক্লিক করলে ওই মাসের ডিটেইলস ওপেন হবে
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => MonthSummaryScreen(
                                messId: messId,
                                monthId: monthId // ওই মাসের আইডি পাঠাচ্ছি
                            )
                        )
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}