import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'auth/login_screen.dart';
import 'mess_selection_screen.dart';

// Tabs Import
import 'tabs/dashboard_tab.dart';
import 'tabs/meal_tab.dart';
import 'tabs/bazaar_tab.dart';
import 'tabs/profile_tab.dart';
import 'tabs/requests_tab.dart';
import 'tabs/components/notification_badge.dart'; // Badge Import

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final user = FirebaseAuth.instance.currentUser;
  int _selectedIndex = 0; // Current Tab Index

  @override
  Widget build(BuildContext context) {
    if (user == null) return const LoginScreen();

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('users').doc(user!.uid).snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        if (snapshot.hasData && snapshot.data!.data() != null) {
          var userData = snapshot.data!.data() as Map<String, dynamic>;
          String messId = userData['mess_id'] ?? "";
          String role = userData['role'] ?? "member"; // Role check

          // 1. Jodi Mess na thake -> Create/Join Page
          if (messId.isEmpty) {
            return const MessSelectionScreen();
          }

          // --- DYNAMIC TABS LOGIC ---
          // Amra list gulo ekhane banabo jate 'role' onujayi filter kora jay

          List<Widget> pages = [];
          List<NavigationDestination> navItems = [];
          List<String> titles = [];

          // 1. Dashboard (Sobai dekhbe)
          pages.add(DashboardTab(userData: userData));
          navItems.add(const NavigationDestination(icon: Icon(Icons.dashboard), label: 'Home'));
          titles.add("Dashboard");

          // 2. Meal (Sobai dekhbe)
          pages.add(const MealTab());
          navItems.add(const NavigationDestination(icon: Icon(Icons.restaurant), label: 'Meal'));
          titles.add("Meal Manager");

          // 3. REQUESTS (ONLY FOR MANAGER) ***
          if (role == 'manager') {
            pages.add(const RequestsTab());
            navItems.add(NavigationDestination(
                icon: NotificationBadge(messId: messId), // Badge shoho Icon
                label: 'Requests'
            ));
            titles.add("Requests & Approvals");
          }

          // 4. Bazaar (Sobai dekhbe)
          pages.add(const BazaarTab());
          navItems.add(const NavigationDestination(icon: Icon(Icons.shopping_cart), label: 'Bazaar'));
          titles.add("Bazaar & Accounts");

          // 5. Profile (Sobai dekhbe)
          pages.add(const ProfileTab());
          navItems.add(const NavigationDestination(icon: Icon(Icons.person), label: 'Profile'));
          titles.add("My Profile");

          // --- SAFETY CHECK ---
          // Role change hole jodi index out of range hoye jay
          if (_selectedIndex >= pages.length) {
            _selectedIndex = 0;
          }

          // 2. Main Scaffold
          return Scaffold(
            appBar: AppBar(
              title: Text(titles[_selectedIndex]), // Dynamic Title
              backgroundColor: Colors.blueAccent,
              foregroundColor: Colors.white,
            ),

            // Body: List theke page select korbe
            body: pages[_selectedIndex],

            // Bottom Navigation
            bottomNavigationBar: NavigationBar(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (index) {
                setState(() => _selectedIndex = index);
              },
              destinations: navItems, // Dynamic List pass korlam
            ),
          );
        }

        return const Scaffold(body: Center(child: Text("No Data Found")));
      },
    );
  }
}