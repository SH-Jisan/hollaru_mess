import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class MessSettingsScreen extends StatefulWidget {
  final String messId;
  const MessSettingsScreen({super.key, required this.messId});

  @override
  State<MessSettingsScreen> createState() => _MessSettingsScreenState();
}

class _MessSettingsScreenState extends State<MessSettingsScreen> {
  // Global Start Time
  TimeOfDay? requestStartTime;

  // Separate Deadlines
  TimeOfDay? lunchEnd;
  TimeOfDay? dinnerEnd;

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentSettings();
  }

  Future<void> _loadCurrentSettings() async {
    var doc = await FirebaseFirestore.instance.collection('messes').doc(widget.messId).get();
    if (doc.exists && doc.data() != null) {
      var data = doc.data() as Map<String, dynamic>;
      setState(() {
        requestStartTime = _stringToTime(data['request_start_time']); // Global Start
        lunchEnd = _stringToTime(data['lunch_end_time']);
        dinnerEnd = _stringToTime(data['dinner_end_time']);
      });
    }
  }

  TimeOfDay? _stringToTime(String? timeStr) {
    if (timeStr == null) return null;
    final parts = timeStr.split(":");
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  Future<void> _pickTime(String type) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() {
        if (type == 'start') requestStartTime = picked;
        if (type == 'lunch_end') lunchEnd = picked;
        if (type == 'dinner_end') dinnerEnd = picked;
      });
    }
  }

  Future<void> _saveSettings() async {
    if (requestStartTime == null || lunchEnd == null || dinnerEnd == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please set ALL times")));
      return;
    }

    setState(() => _isLoading = true);

    await FirebaseFirestore.instance.collection('messes').doc(widget.messId).update({
      'request_start_time': "${requestStartTime!.hour}:${requestStartTime!.minute}",
      'lunch_end_time': "${lunchEnd!.hour}:${lunchEnd!.minute}",
      'dinner_end_time': "${dinnerEnd!.hour}:${dinnerEnd!.minute}",
    });

    setState(() => _isLoading = false);
    if(mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Timing Updated!")));
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Set Meal Timings")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("GLOBAL START TIME", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.blue)),
            const Text("When members can start requesting for NEXT DAY.", style: TextStyle(fontSize: 12, color: Colors.grey)),
            ListTile(
              title: const Text("Request Starts At"),
              subtitle: Text(requestStartTime?.format(context) ?? "Set Start Time"),
              trailing: const Icon(Icons.access_time, color: Colors.blue),
              onTap: () => _pickTime('start'),
            ),

            const Divider(thickness: 2),
            const SizedBox(height: 10),

            const Text("DEADLINES (Request Ends)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.red)),

            ListTile(
              title: const Text("Lunch Deadline"),
              subtitle: Text(lunchEnd?.format(context) ?? "Set End Time"),
              trailing: const Icon(Icons.access_time, color: Colors.orange),
              onTap: () => _pickTime('lunch_end'),
            ),

            ListTile(
              title: const Text("Dinner Deadline"),
              subtitle: Text(dinnerEnd?.format(context) ?? "Set End Time"),
              trailing: const Icon(Icons.access_time, color: Colors.purple),
              onTap: () => _pickTime('dinner_end'),
            ),

            const SizedBox(height: 40),
            _isLoading
                ? const Center(child: CircularProgressIndicator())
                : SizedBox(
              width: double.infinity,
              child: ElevatedButton(onPressed: _saveSettings, child: const Text("Save Settings")),
            )
          ],
        ),
      ),
    );
  }
}