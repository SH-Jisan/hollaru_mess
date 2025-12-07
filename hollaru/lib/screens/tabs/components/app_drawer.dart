import 'package:flutter/material.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  // --- HELPER: COMMON CARD DESIGN ---
  Widget _buildInfoCard({
    required String name,
    required String dept,
    required String session,
    required IconData icon,
    required Color color
  }) {
    return Card(
      elevation: 3,
      margin: const EdgeInsets.symmetric(vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(10.0),
        child: Row(
          children: [
            // Icon / Photo Placeholder
            CircleAvatar(
              radius: 25,
              backgroundColor: color.withOpacity(0.1),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 15),

            // Text Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Dept: $dept",
                    style: TextStyle(color: Colors.grey[700], fontSize: 13),
                  ),
                  Text(
                    "Session: $session",
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- 1. ABOUT APP DIALOG ---
  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("About App & Rules", style: TextStyle(color: Colors.blueAccent)),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Welcome to Smart Mess Manager!", style: TextStyle(fontWeight: FontWeight.bold)),
              SizedBox(height: 10),
              Text("🔹 Meal System:"),
              Text("- Turn ON/OFF meals within the manager's set time."),
              SizedBox(height: 5),
              Text("🔹 Guest Meals:"),
              Text("- Add guests for specific meals (Lunch/Dinner)."),
              SizedBox(height: 5),
              Text("🔹 Finance:"),
              Text("- Bazaar cost is divided equally among active meal counts."),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Got it"))
        ],
      ),
    );
  }

  // --- 2. DEVELOPERS DIALOG ---
  void _showDevDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.code, color: Colors.purple),
            SizedBox(width: 10),
            Text("Developer Info"),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // DEVELOPER 1
              _buildInfoCard(
                name: "YOUR NAME", // আপনার নাম বসান
                dept: "CSE",
                session: "2020-2024",
                icon: Icons.person,
                color: Colors.purple,
              ),

              // DEVELOPER 2 (Optional)
              _buildInfoCard(
                name: "Co-Developer Name",
                dept: "EEE",
                session: "2021-2025",
                icon: Icons.computer,
                color: Colors.blue,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Close"))
        ],
      ),
    );
  }

  // --- 3. DEDICATED TO DIALOG ---
  void _showDedicationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.favorite, color: Colors.red),
            SizedBox(width: 10),
            Text("Dedicated To"),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // DEDICATION 1
              _buildInfoCard(
                name: "My Beloved Parents",
                dept: "Home Ministry",
                session: "Forever",
                icon: Icons.favorite,
                color: Colors.red,
              ),

              // DEDICATION 2
              _buildInfoCard(
                name: "Best Friend Name",
                dept: "BBA",
                session: "2019-2023",
                icon: Icons.star,
                color: Colors.orange,
              ),

              // DEDICATION 3
              _buildInfoCard(
                name: "Respectful Mentor",
                dept: "Faculty of CSE",
                session: "Advisor",
                icon: Icons.school,
                color: Colors.teal,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Close"))
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          // HEADER
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            color: Colors.blueAccent,
            child: const SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: Colors.white,
                    child: Icon(Icons.home_work, size: 30, color: Colors.blueAccent),
                  ),
                  SizedBox(height: 10),
                  Text(
                    "Smart Mess Manager",
                    style: TextStyle(fontSize: 20, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  Text("Version 1.0.0", style: TextStyle(color: Colors.white70)),
                ],
              ),
            ),
          ),

          // MENU ITEMS
          ListTile(
            leading: const Icon(Icons.info_outline, color: Colors.blue),
            title: const Text("About App & Rules"),
            onTap: () => _showAboutDialog(context),
          ),

          ListTile(
            leading: const Icon(Icons.code, color: Colors.purple),
            title: const Text("Developers"),
            onTap: () => _showDevDialog(context),
          ),

          ListTile(
            leading: const Icon(Icons.favorite, color: Colors.red),
            title: const Text("Dedicated To"),
            onTap: () => _showDedicationDialog(context),
          ),

          const Spacer(),

          const Divider(),
          const Padding(
            padding: EdgeInsets.all(10.0),
            child: Text("© 2025 All Rights Reserved", style: TextStyle(color: Colors.grey, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}