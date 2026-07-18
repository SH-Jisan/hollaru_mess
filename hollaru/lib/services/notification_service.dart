import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;

class NotificationService {
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  // --- 1. INITIALIZE ---
  static Future<void> initialize() async {
    // Permission Request (iOS mainly)
    await _firebaseMessaging.requestPermission(
        alert: true, badge: true, sound: true
    );

    // Topic Subscription (সবাই মেসের নোটিফিকেশন পাবে)
    // দ্রষ্টব্য: এটি পরে ডায়নামিক ভাবে MessID দিয়ে সেট করা হবে

    // Foreground Notification Setup (অ্যাপ খোলা থাকলে যাতে নোটিফিকেশন দেখা যায়)
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initSettings = InitializationSettings(android: androidSettings);

    await _localNotifications.initialize(initSettings);

    // Listen to Foreground Messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _showForegroundNotification(message);
    });
  }

  // --- 2. SHOW FOREGROUND NOTIFICATION ---
  static Future<void> _showForegroundNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'mess_channel', 'Mess Updates',
      importance: Importance.max,
      priority: Priority.high,
    );
    const NotificationDetails platformDetails = NotificationDetails(android: androidDetails);

    await _localNotifications.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      platformDetails,
    );
  }

  // --- 3. SUBSCRIBE TO MESS TOPIC ---
  // ইউজার যখন মেসে জয়েন করবে তখন এটি কল করব
  static Future<void> subscribeToMess(String messId) async {
    await _firebaseMessaging.subscribeToTopic('mess_$messId');
    print("Subscribed to topic: mess_$messId");
  }

  // --- 4. SEND NOTIFICATION (SERVERLESS WAY) ---
  // সতর্কতা: এটি 'Legacy API' ব্যবহার করছে। প্রোডাকশন অ্যাপের জন্য এটি নিরাপদ নয়,
  // তবে স্টুডেন্ট প্রজেক্টের জন্য এটি সবচেয়ে সহজ উপায়।
  static Future<void> sendPushNotification({
    required String messId,
    required String title,
    required String body
  }) async {
    try {
      // TODO: এখানে আপনার SERVER KEY বসাতে হবে (নিচে নিয়ম বলা আছে)
      const String serverKey = '915406476802';

      await http.post(
        Uri.parse('https://fcm.googleapis.com/fcm/send'),
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Authorization': 'key=$serverKey',
        },
        body: jsonEncode(
          <String, dynamic>{
            'to': '/topics/mess_$messId', // এই মেসের সবাইকে পাঠাবে
            'notification': <String, dynamic>{
              'title': title,
              'body': body,
            },
            'priority': 'high',
          },
        ),
      );
      print("Notification Sent!");
    } catch (e) {
      print("Error sending notification: $e");
    }
  }
}