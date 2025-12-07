import 'package:flutter/material.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  // --- 1. ABOUT APP DIALOG ---
  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12)
              ),
              child: const Icon(Icons.info_outline_rounded, color: Colors.blueAccent),
            ),
            const SizedBox(width: 15),
            const Text("About & Rules", style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildRuleItem(Icons.restaurant_menu, "Meal System", "Meals are ON by default. Turn OFF within deadline to avoid charges."),
              const SizedBox(height: 20),
              _buildRuleItem(Icons.people_outline, "Guest Policy", "Add guests before meal calculation time. Guest meals count towards total."),
              const SizedBox(height: 20),
              _buildRuleItem(Icons.account_balance_wallet_outlined, "Expenses", "Shared costs (Bazaar, Utilities) are divided by meal rate."),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: Colors.blueAccent.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: Colors.blueAccent.withOpacity(0.2))
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.lightbulb, color: Colors.blueAccent, size: 22),
                    SizedBox(width: 12),
                    Expanded(child: Text("Pro Tip: Use the Dashboard to check live meal status and mess code!", style: TextStyle(fontSize: 13, color: Colors.blueAccent, height: 1.4))),
                  ],
                ),
              )
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Got it"))
        ],
      ),
    );
  }

  Widget _buildRuleItem(IconData icon, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8)
          ),
          child: Icon(icon, size: 20, color: Colors.grey.shade700),
        ),
        const SizedBox(width: 15),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 4),
              Text(desc, style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.3)),
            ],
          ),
        )
      ],
    );
  }

  // --- 2. DEVELOPERS DIALOG ---
  void _showDevDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
        contentPadding: const EdgeInsets.all(25),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("Meet the Developer", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 25),
              _buildProfileCard(
                name: "Hasan", 
                role: "Full Stack Developer",
                dept: "Computer Science",
                color: Colors.purple,
                icon: Icons.code,
                showSocials: true
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
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
        contentPadding: EdgeInsets.zero,
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.red.shade400, Colors.pink.shade300],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(25)),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.volunteer_activism_rounded, size: 40, color: Colors.white),
                      SizedBox(height: 10),
                      Text(
                        "In Loving Memory of",
                        style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 1.2),
                      ),
                      SizedBox(height: 5),
                      Text(
                        "Sordar Hotel",
                        style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 1),
                      ),
                      Text(
                        "Where memories were made",
                        style: TextStyle(color: Colors.white, fontSize: 12, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 15),
                  child: Column(
                    children: [
                      _buildMemberCard(name: "Sefatullah vai", dept: "Food Engineering", session: "2018-19", imagePath: 'assets/images/sefatullah_vai.jpg'),
                      _buildMemberCard(name: "Tanvir vai", dept: "Food Engineering", session: "2018-19", imagePath: 'assets/images/tanvir_vai.jpg'),
                      _buildMemberCard(name: "Forhad vai", dept: "Food Engineering", session: "2018-19", imagePath: 'assets/images/forhad_vai.jpg'),
                      _buildMemberCard(name: "Sojib vai", dept: "Food Engineering", session: "2018-19", imagePath: 'assets/images/sajib_vai.jpg'),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), style: TextButton.styleFrom(foregroundColor: Colors.grey), child: const Text("Close"))
        ],
      ),
    );
  }
  
  Widget _buildProfileCard({required String name, required String role, required String dept, required Color color, IconData? icon, bool showSocials = false}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.grey.withOpacity(0.1), blurRadius: 15, offset: const Offset(0, 8))],
        border: Border.all(color: Colors.grey.shade100)
      ),
      child: Column(
        children: [
          CircleAvatar(radius: 35, backgroundColor: color.withOpacity(0.1), child: Icon(icon ?? Icons.person, color: color, size: 35)),
          const SizedBox(height: 15),
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black87)),
          const SizedBox(height: 5),
          Text(role, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
          Text(dept, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          if(showSocials) ...[
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _socialIcon(Icons.email_outlined, Colors.red),
                const SizedBox(width: 15),
                _socialIcon(Icons.code, Colors.black),
                const SizedBox(width: 15),
                _socialIcon(Icons.link, Colors.blue),
              ],
            )
          ]
        ],
      ),
    );
  }

  Widget _socialIcon(IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.1)),
      child: Icon(icon, color: color, size: 18),
    );
  }

  Widget _buildMemberCard({required String name, required String dept, required String session, required String imagePath}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [BoxShadow(color: Colors.red.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
        border: Border.all(color: Colors.red.shade50)
      ),
      child: Stack(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.all(12),
            leading: Hero(
              tag: name,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.red.shade100, width: 2)),
                child: CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.grey.shade200,
                  backgroundImage: AssetImage(imagePath),
                  onBackgroundImageError: (_, __) => const Icon(Icons.person, color: Colors.grey),
                ),
              ),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Row(children: [Icon(Icons.school, size: 14, color: Colors.grey.shade600), const SizedBox(width: 5), Text(dept, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))]),
                const SizedBox(height: 2),
                Row(children: [Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade600), const SizedBox(width: 5), Text("Batch: $session", style: TextStyle(fontSize: 12, color: Colors.grey.shade700))]),
              ],
            ),
          ),
          Positioned(right: 12, top: 12, child: Icon(Icons.favorite, size: 16, color: Colors.red.shade200))
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
          SizedBox(
            height: 250, // Increased Height to prevent text overflow
            child: Stack(
              children: [
                Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(colors: [Color(0xFF6A11CB), Color(0xFF2575FC)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                    borderRadius: BorderRadius.only(bottomLeft: Radius.circular(30), bottomRight: Radius.circular(30)),
                  ),
                ),
                Positioned(top: -30, right: -30, child: Container(width: 120, height: 120, decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), shape: BoxShape.circle))),
                Positioned(bottom: 30, left: -20, child: Container(width: 80, height: 80, decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), shape: BoxShape.circle))),
                const Padding(
                  padding: EdgeInsets.fromLTRB(25, 60, 20, 20), // Reduced top padding slightly
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircleAvatar(radius: 38, backgroundColor: Colors.white, child: Icon(Icons.apartment_rounded, size: 38, color: Color(0xFF6A11CB))),
                      SizedBox(height: 15),
                      // Removed Flexible to avoid unintended shrinking
                      Text(
                        "Hollaru Manager", 
                        style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.5),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: 4),
                      Text(
                        "Manage your mess smartly", 
                        style: TextStyle(fontSize: 14, color: Colors.white70),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // MENU ITEMS (Expanded takes remaining space)
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 25, horizontal: 15),
              children: [
                _buildDrawerItem(context, icon: Icons.info_outline, title: "About & Rules", color: Colors.blue, onTap: () => _showAboutDialog(context)),
                const SizedBox(height: 12),
                _buildDrawerItem(context, icon: Icons.code, title: "Developers", color: Colors.purple, onTap: () => _showDevDialog(context)),
                const SizedBox(height: 12),
                _buildDrawerItem(context, icon: Icons.favorite_border, title: "Dedicated To", color: Colors.pink, onTap: () => _showDedicationDialog(context)),
              ],
            ),
          ),

          // FOOTER (SafeArea ensures no bottom overlap)
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min, 
                children: [
                  const Divider(indent: 50, endIndent: 50),
                  const SizedBox(height: 10),
                  Text("Version 1.0.0", style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.bold)),
                  const SizedBox(height: 5),
                  Text("© 2025 All Rights Reserved", style: TextStyle(color: Colors.grey[400], fontSize: 11)),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, {required IconData icon, required String title, required Color color, required VoidCallback onTap}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? Colors.grey.shade900 : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.withOpacity(0.1)),
            boxShadow: [if(!isDark) BoxShadow(color: Colors.grey.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))]
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [color.withOpacity(0.1), color.withOpacity(0.2)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 0.3))),
              Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}