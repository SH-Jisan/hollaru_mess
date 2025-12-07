import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class MembersScreen extends StatelessWidget {
  final String messId;
  final String currentUserRole;

  const MembersScreen({super.key, required this.messId, required this.currentUserRole});

  // --- LOGIC: MAKE MANAGER (Role Swap) ---
  Future<void> _makeManager(BuildContext context, String newManagerId, String newManagerName) async {
    final currentUser = FirebaseAuth.instance.currentUser;

    bool confirm = await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text("Promote $newManagerName?"),
          content: const Text("You will lose Manager access immediately, and they will become the new Manager."),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text("Confirm Change"),
            ),
          ],
        )
    ) ?? false;

    if (confirm) {
      try {
        // 1. Update Old Manager (Me) -> Member
        await FirebaseFirestore.instance.collection('users').doc(currentUser!.uid).update({
          'role': 'member'
        });

        // 2. Update New Manager -> Manager
        await FirebaseFirestore.instance.collection('users').doc(newManagerId).update({
          'role': 'manager'
        });

        // 3. Update Mess Info (Optional, but good for tracking)
        await FirebaseFirestore.instance.collection('messes').doc(messId).update({
          'manager_id': newManagerId
        });

        if(context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$newManagerName is now the Manager!")));
          Navigator.pop(context); // Go back to prevent permission issues on this screen
        }

      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
      }
    }
  }

  // --- LOGIC: KICK MEMBER ---
  Future<void> _kickMember(BuildContext context, String memberId, String memberName) async {
    bool confirm = await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text("Remove $memberName?"),
          content: const Text("They will be removed from this mess immediately."),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text("Remove"),
            ),
          ],
        )
    ) ?? false;

    if (confirm) {
      await FirebaseFirestore.instance.collection('messes').doc(messId).update({
        'members': FieldValue.arrayRemove([memberId])
      });

      await FirebaseFirestore.instance.collection('users').doc(memberId).update({
        'mess_id': '',
        'role': 'member'
      });

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$memberName removed!")));
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = FirebaseAuth.instance.currentUser!.uid;

    return Scaffold(
      appBar: AppBar(title: const Text("Mess Members")),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('users')
            .where('mess_id', isEqualTo: messId)
            .snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          var members = snapshot.data!.docs;

          if (members.isEmpty) return const Center(child: Text("No members found."));

          return ListView.builder(
            itemCount: members.length,
            itemBuilder: (context, index) {
              var data = members[index].data() as Map<String, dynamic>;
              String uid = members[index].id;
              String name = data['name'] ?? "Unknown";
              String role = data['role'] ?? "member";
              String phone = data['phone'] ?? "";

              bool isMe = uid == currentUserId;
              bool amIManager = currentUserRole == 'manager';

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: role == 'manager' ? Colors.blue : Colors.grey.shade300,
                    foregroundColor: role == 'manager' ? Colors.white : Colors.black,
                    child: Icon(role == 'manager' ? Icons.security : Icons.person),
                  ),
                  title: Text(name + (isMe ? " (You)" : "")),
                  subtitle: Text(phone.isNotEmpty ? phone : role.toUpperCase()),

                  // TRAILING ACTIONS (Only for Manager)
                  trailing: (amIManager && !isMe)
                      ? Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // MAKE MANAGER BUTTON
                      IconButton(
                        icon: const Icon(Icons.star_outline, color: Colors.amber),
                        tooltip: "Make Manager",
                        onPressed: () => _makeManager(context, uid, name),
                      ),
                      // KICK BUTTON
                      IconButton(
                        icon: const Icon(Icons.person_remove, color: Colors.red),
                        tooltip: "Remove Member",
                        onPressed: () => _kickMember(context, uid, name),
                      ),
                    ],
                  )
                      : null,
                ),
              );
            },
          );
        },
      ),
    );
  }
}