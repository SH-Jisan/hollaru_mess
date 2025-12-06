import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class MembersScreen extends StatelessWidget {
  final String messId;
  final String currentUserRole;

  const MembersScreen({super.key, required this.messId, required this.currentUserRole});

  // --- KICK MEMBER LOGIC ---
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
      // 1. Remove from Mess Member List
      await FirebaseFirestore.instance.collection('messes').doc(messId).update({
        'members': FieldValue.arrayRemove([memberId])
      });

      // 2. Reset User Profile
      await FirebaseFirestore.instance.collection('users').doc(memberId).update({
        'mess_id': '',
        'role': 'member' // Reset role
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
        // Query: Get all users who belong to this mess
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
                  trailing: (currentUserRole == 'manager' && !isMe)
                      ? IconButton(
                    icon: const Icon(Icons.person_remove, color: Colors.red),
                    onPressed: () => _kickMember(context, uid, name),
                  )
                      : null, // Managers cannot kick themselves or other managers logic can be added
                ),
              );
            },
          );
        },
      ),
    );
  }
}