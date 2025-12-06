import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class MessSettingsScreen extends StatefulWidget {
  final String messId;
  const MessSettingsScreen({super.key, required this.messId});

  @override
  State<MessSettingsScreen> createState() => _MessSettingsScreenState();
}

class _MessSettingsScreenState extends State<MessSettingsScreen> {
  TimeOfDay? lunchTime;
  TimeOfDay? dinnerTime;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentSettings();
  }

  // Ager save kora time load kora
  Future<void> _loadCurrentSettings() async {
    var doc = await FirebaseFirestore.instance.collection('messes').doc(widget.messId).get();
    if (doc.exists && doc.data() != null) {
      var data = doc.data() as Map<String, dynamic>;
      setState(() {
        lunchTime = _stringToTime(data['lunch_deadline']);
        dinnerTime = _stringToTime(data['dinner_deadline']);
      });
    }
  }

  // String ("10:30") theke TimeOfDay banano
  TimeOfDay? _stringToTime(String? timeStr) {
    if (timeStr == null) return null;
    final parts = timeStr.split(":");
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  // Time Select Dialog
  Future<void> _pickTime(bool isLunch) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() {
        if (isLunch) lunchTime = picked;
        else dinnerTime = picked;
      });
    }
  }

  // Save Function
  Future<void> _saveSettings() async {
    if (lunchTime == null || dinnerTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please select both times")));
      return;
    }

    setState(() => _isLoading = true);

    // Time ke "HH:mm" format e save korbo (Example: "14:30")
    String lTime = "${lunchTime!.hour}:${lunchTime!.minute}";
    String dTime = "${dinnerTime!.hour}:${dinnerTime!.minute}";

    await FirebaseFirestore.instance.collection('messes').doc(widget.messId).update({
      'lunch_deadline': lTime,
      'dinner_deadline': dTime,
    });

    setState(() => _isLoading = false);
    if(mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Deadlines Updated!")));
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Set Request Deadlines")),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            const Text("Set last time for Meal Off/Add:", style: TextStyle(fontSize: 16)),
            const SizedBox(height: 20),

            // Lunch Picker
            ListTile(
              title: const Text("Lunch Last Time"),
              subtitle: Text(lunchTime?.format(context) ?? "Not Set"),
              trailing: const Icon(Icons.access_time, color: Colors.orange),
              onTap: () => _pickTime(true),
            ),
            const Divider(),

            // Dinner Picker
            ListTile(
              title: const Text("Dinner Last Time"),
              subtitle: Text(dinnerTime?.format(context) ?? "Not Set"),
              trailing: const Icon(Icons.access_time, color: Colors.purple),
              onTap: () => _pickTime(false),
            ),

            const SizedBox(height: 40),

            _isLoading
                ? const CircularProgressIndicator()
                : SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saveSettings,
                child: const Text("Save Settings"),
              ),
            )
          ],
        ),
      ),
    );
  }
}