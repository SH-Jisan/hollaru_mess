import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart'; // Date format korar jonne
import '../mess_settings_screen.dart'; // Mess Settings Page'

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  // --- LOGIC: LOGOUT ---
  void _logout(BuildContext context) async {
    await FirebaseAuth.instance.signOut();
    // Main.dart er StreamBuilder automatic Login page e niye jabe
  }

  // --- LOGIC: START MONTH (Only Manager) ---
  Future<void> _startNewMonth(BuildContext context, String messId) async {
    try {
      // 1. Current Month er nam ber kora (Ex: Dec_2024)
      String monthName = DateFormat('MMM_yyyy').format(DateTime.now());

      // 2. Mess Collection update kora
      await FirebaseFirestore.instance.collection('messes').doc(messId).update({
        'current_month_id': monthName,
        'is_month_active': true,
        'meal_rate': 0.0, // Notun mash, rate 0
      });

      // 3. Notun Masher folder create kora (Optional init)
      await FirebaseFirestore.instance
          .collection('messes')
          .doc(messId)
          .collection('monthly_data')
          .doc(monthName)
          .set({
        'created_at': DateTime.now(),
        'total_cost': 0,
        'total_meals': 0,
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("New Month Started Successfully!")),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('users').doc(user!.uid).snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        var userData = snapshot.data!.data() as Map<String, dynamic>;
        String messId = userData['mess_id'];
        String role = userData['role']; // 'manager' or 'member'

        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              // 1. User Info Card
              Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.blueAccent,
                    child: Text(userData['name'][0].toUpperCase(), style: const TextStyle(color: Colors.white)),
                  ),
                  title: Text(userData['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(userData['email']),
                  trailing: Chip(label: Text(role.toUpperCase())),
                ),
              ),

              const SizedBox(height: 20),

              // 2. MANAGER ADMIN PANEL (Shudhu Manager dekhbe)
              if (role == 'manager') ...[
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text("Manager Admin Panel", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 10),

                // Mess Status Check kora
                StreamBuilder<DocumentSnapshot>(
                  stream: FirebaseFirestore.instance.collection('messes').doc(messId).snapshots(),
                  builder: (context, messSnap) {
                    if (!messSnap.hasData) return const LinearProgressIndicator();
                    var messData = messSnap.data!.data() as Map<String, dynamic>;

                    bool isMonthActive = messData['is_month_active'] ?? false;
                    String currentMonth = messData['current_month_id'] ?? "None";

                    return Card(
                      color: Colors.orange.shade50,
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            Text("Current Month: $currentMonth", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 10),

                            // Jodi Mash chalu na thake -> START BUTTON
                            if (!isMonthActive)
                              ElevatedButton.icon(
                                onPressed: () => _startNewMonth(context, messId),
                                icon: const Icon(Icons.play_arrow),
                                label: const Text("Start New Month"),
                                style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                              )
                            // Jodi Mash chalu thake -> END BUTTON
                            else
                              ElevatedButton.icon(
                                onPressed: () {
                                  // Pore End Month Logic dibo
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Month is already running!")));
                                },
                                icon: const Icon(Icons.stop),
                                label: const Text("End Current Month"),
                                style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
              const SizedBox(height: 10),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.timer, color: Colors.blue),
                title: const Text("Set Meal Timings"),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  // Import korte hobe: mess_settings_screen.dart
                  Navigator.push(context, MaterialPageRoute(builder: (_) => MessSettingsScreen(messId: messId)));
                },
              ),
              const Spacer(),

              // 3. Logout Button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _logout(context),
                  icon: const Icon(Icons.logout, color: Colors.red),
                  label: const Text("Logout", style: TextStyle(color: Colors.red)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}