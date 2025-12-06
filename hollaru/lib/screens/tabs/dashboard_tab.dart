import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/services.dart'; // Copy korar jonne

class DashboardTab extends StatelessWidget {
  final Map<String, dynamic> userData;

  const DashboardTab({super.key, required this.userData});

  @override
  Widget build(BuildContext context) {
    String messId = userData['mess_id'];

    // Mess er details anar jonne Stream
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('messes').doc(messId).snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        var messData = snapshot.data!.data() as Map<String, dynamic>;

        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Welcome Card
              Card(
                color: Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Text(
                        messData['mess_name'] ?? "My Mess",
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue),
                      ),
                      const SizedBox(height: 10),
                      const Text("Mess Join Code (Share with members):"),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            messData['mess_code'] ?? "...",
                            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, letterSpacing: 2),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: messData['mess_code']));
                              ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("Code Copied!"))
                              );
                            },
                          )
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // 2. Live Meal Status (Placeholder for now)
              const Text("Today's Overview", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),

              // Ekhane pore amra "Lunch" ar "Dinner" er count dekhabo
              Row(
                children: [
                  _buildStatusCard("Lunch", "Running", Colors.orange),
                  const SizedBox(width: 10),
                  _buildStatusCard("Dinner", "Pending", Colors.purple),
                ],
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatusCard(String title, String status, Color color) {
    return Expanded(
      child: Card(
        elevation: 4,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              border: Border(left: BorderSide(color: color, width: 5))
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontSize: 16, color: Colors.grey[700])),
              const SizedBox(height: 5),
              Text(status, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}