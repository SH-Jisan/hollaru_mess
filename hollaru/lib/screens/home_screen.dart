import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'auth/login_screen.dart';
import 'mess_selection_screen.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final user = FirebaseAuth.instance.currentUser;

  // Logout Function
  void _logout() async {
    await FirebaseAuth.instance.signOut();
    // Login page e pathiye dibo
    Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen())
    );
  }

  @override
  Widget build(BuildContext context) {
    // 1. User jodi login na thake (Safety check)
    if (user == null) return const LoginScreen();

    // 2. Database theke User er tottho ana (Stream)
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('users').doc(user!.uid).snapshots(),
      builder: (context, snapshot) {
        // Loading...
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        // Kono error hole
        if (snapshot.hasError) {
          return const Scaffold(body: Center(child: Text("Something went wrong!")));
        }

        // Data pawa gele
        if (snapshot.hasData && snapshot.data!.data() != null) {
          var userData = snapshot.data!.data() as Map<String, dynamic>;
          String messId = userData['mess_id'] ?? ""; // mess_id check

          // CASE A: User kono mess-e nai (mess_id khali)
          if (messId.isEmpty) {
            return const MessSelectionScreen();
          }

          // CASE B: User mess-e ache (Dashboard dekhabo)
          else {
            return _buildDashboardView(userData);
          }
        }

        return const Scaffold(body: Center(child: Text("No Data Found")));
      },
    );
  }

  // --- VIEW 1: Jokhon Mess Nai (Create/Join Option) ---
  Widget _buildNoMessView() {
    return Scaffold(
      appBar: AppBar(title: const Text("Welcome!"), actions: [
        IconButton(onPressed: _logout, icon: const Icon(Icons.logout))
      ]),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text("Apni ekhono kono Mess-e nai.", style: TextStyle(fontSize: 18)),
              const SizedBox(height: 20),

              // Create Mess Button
              ElevatedButton.icon(
                onPressed: () {
                  // Pore logic dibo
                  print("Create Mess Clicked");
                },
                icon: const Icon(Icons.add_home),
                label: const Text("Create New Mess"),
                style: ElevatedButton.styleFrom(minimumSize: const Size(200, 50)),
              ),

              const SizedBox(height: 10),
              const Text("OR"),
              const SizedBox(height: 10),

              // Join Mess Button
              OutlinedButton.icon(
                onPressed: () {
                  // Pore logic dibo
                  print("Join Mess Clicked");
                },
                icon: const Icon(Icons.group_add),
                label: const Text("Join Existing Mess"),
                style: OutlinedButton.styleFrom(minimumSize: const Size(200, 50)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- VIEW 2: Dashboard (Jokhon Mess Ache) ---
  Widget _buildDashboardView(Map<String, dynamic> data) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Mess Dashboard"),
        backgroundColor: Colors.blueAccent,
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout))
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text("Hello, ${data['name']}", style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 10),
            Text("Your Role: ${data['role']}", style: const TextStyle(fontSize: 18, color: Colors.grey)),
            const SizedBox(height: 30),
            const Text("Meal Counter Coming Soon...", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}