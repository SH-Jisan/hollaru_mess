import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

class BazaarTab extends StatefulWidget {
  const BazaarTab({super.key});

  @override
  State<BazaarTab> createState() => _BazaarTabState();
}

class _BazaarTabState extends State<BazaarTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final user = FirebaseAuth.instance.currentUser;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this); // 2 ta section: Bazaar & Deposit
  }

  // --- HELPER: Current Month & Mess ID ber kora ---
  Future<Map<String, String>?> _getMessInfo() async {
    var userDoc = await FirebaseFirestore.instance.collection('users').doc(user!.uid).get();
    String messId = userDoc['mess_id'];

    var messDoc = await FirebaseFirestore.instance.collection('messes').doc(messId).get();
    if (!messDoc['is_month_active']) return null; // Month chalu na thakle kaj hobe na

    return {
      'mess_id': messId,
      'month_id': messDoc['current_month_id'],
      'role': userDoc['role'],
    };
  }

  // --- ACTION 1: ADD BAZAAR LIST (Manager Only) ---
  void _showAddBazaarDialog(String messId, String monthId) {
    final itemController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Create Bazaar List"),
        content: TextField(
          controller: itemController,
          decoration: const InputDecoration(labelText: "Items (Ex: Chal, Dal, Tel)", border: OutlineInputBorder()),
          maxLines: 2,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (itemController.text.isNotEmpty) {
                await FirebaseFirestore.instance
                    .collection('messes').doc(messId)
                    .collection('monthly_data').doc(monthId)
                    .collection('bazaar_items').add({
                  'items': itemController.text,
                  'cost': 0,
                  'status': 'pending', // Ekhono kena hoy nai
                  'added_by': user!.uid,
                  'date': DateTime.now(),
                });
                Navigator.pop(context);
              }
            },
            child: const Text("Add to List"),
          )
        ],
      ),
    );
  }

  // --- ACTION 2: COMPLETE BAZAAR (Anyone) ---
  void _showCompleteBazaarDialog(String messId, String monthId, String docId, String items) {
    final costController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Bazaar: $items"),
        content: TextField(
          controller: costController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: "Total Cost (Taka)", border: OutlineInputBorder(), prefixText: "৳ "),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (costController.text.isNotEmpty) {
                int cost = int.parse(costController.text);

                // 1. Bazaar Item Update
                await FirebaseFirestore.instance
                    .collection('messes').doc(messId)
                    .collection('monthly_data').doc(monthId)
                    .collection('bazaar_items').doc(docId).update({
                  'cost': cost,
                  'status': 'completed',
                  'shopper_id': user!.uid, // Je update korlo se kineche
                  'shopper_name': user!.displayName ?? "Unknown", // Display name lagbe (Login e save kora hoy nai, tai Unknown ashte pare, pore fix korbo)
                });

                // 2. Total Mess Cost Update (Calculation er jonne)
                await FirebaseFirestore.instance
                    .collection('messes').doc(messId)
                    .collection('monthly_data').doc(monthId).update({
                  'total_bazaar_cost': FieldValue.increment(cost)
                });

                Navigator.pop(context);
              }
            },
            child: const Text("Confirm Purchase"),
          )
        ],
      ),
    );
  }

  // --- ACTION 3: ADD DEPOSIT (Manager Only) ---
  void _showAddDepositDialog(String messId, String monthId) {
    final amountController = TextEditingController();
    String? selectedMemberId;

    // Member list anar jonne Stream lagbe na, simple Future holei hobe for dropdown
    // Kintu simplicity'r jonne amra User Email diyeo korte pari. Or better, load members.
    // Ekhonkar jonne simple Input Field rakhi, pore Dropdown korbo.

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Add Deposit"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text("Select Member logic pore add korbo, ekhon test er jonne nijer nam e jog hobe."),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: "Amount", border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () async {
              if (amountController.text.isNotEmpty) {
                int amount = int.parse(amountController.text);

                await FirebaseFirestore.instance
                    .collection('messes').doc(messId)
                    .collection('monthly_data').doc(monthId)
                    .collection('deposits').add({
                  'member_id': user!.uid, // TODO: Select Member dropdown
                  'member_name': "Me", // TODO: Real name
                  'amount': amount,
                  'date': DateTime.now(),
                });

                Navigator.pop(context);
              }
            },
            child: const Text("Add Money"),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, String>?>(
      future: _getMessInfo(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: Text("Loading or No Active Month..."));

        // Month Active na thakle
        if (snapshot.data == null) return const Center(child: Text("Please Start a Month from Profile first!"));

        String messId = snapshot.data!['mess_id']!;
        String monthId = snapshot.data!['month_id']!;
        String role = snapshot.data!['role']!;

        return Scaffold(
          appBar: AppBar(
            toolbarHeight: 0, // Hide default appbar
            bottom: TabBar(
              controller: _tabController,
              tabs: const [
                Tab(icon: Icon(Icons.shopping_bag), text: "Bazaar List"),
                Tab(icon: Icon(Icons.attach_money), text: "Deposits"),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              // --- TAB 1: BAZAAR LIST ---
              Scaffold(
                floatingActionButton: role == 'manager'
                    ? FloatingActionButton.extended(
                  onPressed: () => _showAddBazaarDialog(messId, monthId),
                  label: const Text("Create List"),
                  icon: const Icon(Icons.add),
                )
                    : null,
                body: StreamBuilder<QuerySnapshot>(
                  stream: FirebaseFirestore.instance
                      .collection('messes').doc(messId)
                      .collection('monthly_data').doc(monthId)
                      .collection('bazaar_items')
                      .orderBy('status', descending: true) // Pending age dekhabe
                      .snapshots(),
                  builder: (context, bSnap) {
                    if (!bSnap.hasData) return const Center(child: CircularProgressIndicator());
                    var items = bSnap.data!.docs;

                    if (items.isEmpty) return const Center(child: Text("No bazaar items yet."));

                    return ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        var data = items[index].data() as Map<String, dynamic>;
                        String docId = items[index].id;
                        bool isCompleted = data['status'] == 'completed';

                        return Card(
                          color: isCompleted ? Colors.green.shade50 : Colors.red.shade50,
                          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          child: ListTile(
                            leading: Icon(
                              isCompleted ? Icons.check_circle : Icons.pending,
                              color: isCompleted ? Colors.green : Colors.red,
                            ),
                            title: Text(data['items'], style: TextStyle(decoration: isCompleted ? TextDecoration.lineThrough : null)),
                            subtitle: isCompleted
                                ? Text("Cost: ৳${data['cost']} (Bought by someone)")
                                : const Text("Pending... Tap to buy"),
                            trailing: isCompleted
                                ? Text("৳${data['cost']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))
                                : IconButton(
                              icon: const Icon(Icons.add_shopping_cart, color: Colors.blue),
                              onPressed: () => _showCompleteBazaarDialog(messId, monthId, docId, data['items']),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),

              // --- TAB 2: DEPOSITS ---
              Scaffold(
                floatingActionButton: role == 'manager'
                    ? FloatingActionButton(
                  onPressed: () => _showAddDepositDialog(messId, monthId),
                  child: const Icon(Icons.add),
                )
                    : null,
                body: StreamBuilder<QuerySnapshot>(
                  stream: FirebaseFirestore.instance
                      .collection('messes').doc(messId)
                      .collection('monthly_data').doc(monthId)
                      .collection('deposits')
                      .orderBy('date', descending: true)
                      .snapshots(),
                  builder: (context, dSnap) {
                    if (!dSnap.hasData) return const Center(child: CircularProgressIndicator());
                    var deposits = dSnap.data!.docs;

                    return ListView.builder(
                      itemCount: deposits.length,
                      itemBuilder: (context, index) {
                        var data = deposits[index].data() as Map<String, dynamic>;
                        return Card(
                          child: ListTile(
                            leading: const CircleAvatar(child: Text("৳")),
                            title: Text("Amount: ৳${data['amount']}"),
                            subtitle: Text("Date: ${DateFormat('dd MMM').format(data['date'].toDate())}"),
                            trailing: const Icon(Icons.check, color: Colors.green),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}