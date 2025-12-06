import 'dart:math';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class MessSelectionScreen extends StatefulWidget {
  const MessSelectionScreen({super.key});

  @override
  State<MessSelectionScreen> createState() => _MessSelectionScreenState();
}

class _MessSelectionScreenState extends State<MessSelectionScreen> {
  bool _isLoading = false;

  // --- LOGIC 1: CREATE MESS ---
  void _showCreateMessDialog() {
    final nameController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Create New Mess"),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
              labelText: "Mess Name",
              hintText: "Ex: Bachelor Point",
              border: OutlineInputBorder()
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isNotEmpty) {
                Navigator.pop(context); // Dialog bondho koro
                _createMess(nameController.text.trim());
              }
            },
            child: const Text("Create"),
          ),
        ],
      ),
    );
  }

  Future<void> _createMess(String messName) async {
    setState(() => _isLoading = true);
    final user = FirebaseAuth.instance.currentUser;

    try {
      // 1. Unique Code Generate kora (Ex: MESS-1234)
      String uniqueCode = "MESS-${Random().nextInt(9000) + 1000}";

      // 2. Database e notun mess create kora
      DocumentReference messRef = await FirebaseFirestore.instance.collection('messes').add({
        'mess_name': messName,
        'mess_code': uniqueCode, // Join korar code
        'created_by': user!.uid,
        'created_at': DateTime.now(),
        'members': [user.uid], // Prothom member manager nijei
        'manager_id': user.uid, // Manager set kora
      });

      // 3. User er profile update kora (Manager hisebe)
      await FirebaseFirestore.instance.collection('users').doc(user.uid).update({
        'mess_id': messRef.id,
        'role': 'manager', // Role change!
      });

      // Kono Message deyar dorkar nai, Home Screen automatic Dashboard e niye jabe

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // --- LOGIC 2: JOIN MESS ---
  void _showJoinMessDialog() {
    final codeController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Join Existing Mess"),
        content: TextField(
          controller: codeController,
          decoration: const InputDecoration(
              labelText: "Enter Mess Code",
              hintText: "Ex: MESS-1234",
              border: OutlineInputBorder()
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () {
              if (codeController.text.isNotEmpty) {
                Navigator.pop(context);
                _joinMess(codeController.text.trim());
              }
            },
            child: const Text("Join"),
          ),
        ],
      ),
    );
  }

  Future<void> _joinMess(String code) async {
    setState(() => _isLoading = true);
    final user = FirebaseAuth.instance.currentUser;

    try {
      // 1. Code diye Mess khuja
      QuerySnapshot query = await FirebaseFirestore.instance
          .collection('messes')
          .where('mess_code', isEqualTo: code)
          .limit(1)
          .get();

      if (query.docs.isEmpty) {
        throw "Invalid Mess Code! Kono mess pawa jayni.";
      }

      var messDoc = query.docs.first;

      // 2. User update kora (Role: member)
      // Note: Amra sorasori join koracchi, pore 'Request' system add kora jabe

      // A. Mess er member list e add kora
      await FirebaseFirestore.instance.collection('messes').doc(messDoc.id).update({
        'members': FieldValue.arrayUnion([user!.uid])
      });

      // B. User profile update kora
      await FirebaseFirestore.instance.collection('users').doc(user.uid).update({
        'mess_id': messDoc.id,
        'role': 'member',
      });

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Successfully Joined!")));

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red)
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // --- UI DESIGN ---
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Welcome to Smart Mess"), actions: [
        IconButton(
            onPressed: () => FirebaseAuth.instance.signOut(),
            icon: const Icon(Icons.logout)
        )
      ]),
      body: Center(
        child: _isLoading
            ? const CircularProgressIndicator()
            : Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.home_work_outlined, size: 80, color: Colors.blue),
              const SizedBox(height: 20),
              const Text(
                "Apni ekhono kono Mess-e nai.",
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
              const SizedBox(height: 40),

              // CREATE BUTTON
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _showCreateMessDialog,
                  icon: const Icon(Icons.add),
                  label: const Text("Create New Mess"),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                ),
              ),

              const SizedBox(height: 15),
              const Text("OR"),
              const SizedBox(height: 15),

              // JOIN BUTTON
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: _showJoinMessDialog,
                  icon: const Icon(Icons.login),
                  label: const Text("Join with Code"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}