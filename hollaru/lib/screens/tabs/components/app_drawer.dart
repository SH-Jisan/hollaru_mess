import 'package:flutter/material.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

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
              Text("🔹 Meal System:", style: TextStyle(fontWeight: FontWeight.bold)),
              Text("- By default, everyone's meal is ON."),
              Text("- You must turn OFF meals within the time limit set by the Manager."),
              Text("- Start/End times are strictly followed."),
              SizedBox(height: 10),
              Text("🔹 Guest Meals:", style: TextStyle(fontWeight: FontWeight.bold)),
              Text("- You can add guest meals for specific days."),
              Text("- These will be added to your final count."),
              SizedBox(height: 10),
              Text("🔹 Finance:", style: TextStyle(fontWeight: FontWeight.bold)),
              Text("- Manager adds deposits."),
              Text("- Bazaar cost is divided by total meals at month-end."),
              SizedBox(height: 10),
              Text("💡 Tip: Always check the 'Dashboard' for live updates."),
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
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Developed with ❤️ by:", style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 5),
            Text("YOUR NAME HERE", style: TextStyle(fontSize: 18, color: Colors.purple)), // আপনার নাম দিন
            Text("(Full Stack Developer)"),
            SizedBox(height: 15),
            Text("Contact:", style: TextStyle(fontWeight: FontWeight.bold)),
            Text("your.email@example.com"),
          ],
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
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text("This project is dedicated to my beloved parents and friends who supported me."),
            SizedBox(height: 10),
            Divider(),
            Text("✨ My Parents", style: TextStyle(fontWeight: FontWeight.bold)),
            Text("✨ My Messmates"),
            Text("✨ All Bachelors struggle in Mess Life"),
          ],
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
                  Text(
                    "Version 1.0.0",
                    style: TextStyle(color: Colors.white70),
                  ),
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
            leading: const Icon(Icons.favorite_border, color: Colors.red),
            title: const Text("Dedicated To"),
            onTap: () => _showDedicationDialog(context),
          ),

          const Spacer(), // নিচ পর্যন্ত ধাক্কা দিবে

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