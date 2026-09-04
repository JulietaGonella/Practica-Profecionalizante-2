import {
  getMyNotificationsService,
  markAsReadService,
  markAllAsReadService
} from '../services/notifications.service.js';

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await getMyNotificationsService(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await markAsReadService(id, userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await markAllAsReadService(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};