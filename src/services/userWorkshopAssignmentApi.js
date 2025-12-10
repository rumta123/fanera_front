// src/services/userWorkshopAssignmentApi.js
import { apiRequest } from '../utils/api';
import { userWorkshopApi } from './userWorkshopApi';

/**
 * Загружает всех пользователей и цеха + привязки
 */
export const loadAssignmentData = async () => {
  const [users, workshops] = await Promise.all([
    apiRequest('/auth/users'),
    apiRequest('/workshops'),
  ]);

  const usersWithWorkshops = await Promise.all(
    users.map(async (user) => {
      try {
        const assignments = await userWorkshopApi.getWorkshopsByUser(user.id);
        const workshopMap = new Map();
        assignments.forEach((a) => {
          workshopMap.set(a.workshop_id, a.position || 'technologist');
        });
        return { ...user, workshopMap };
      } catch {
        return { ...user, workshopMap: new Map() };
      }
    })
  );

  return { users: usersWithWorkshops, workshops };
};

/**
 * Обновляет привязку: если position === "", удаляет; иначе назначает
 */
export const updateWorkshopAssignment = async (userId, workshopId, position) => {
  if (!position) {
    await userWorkshopApi.remove(userId, workshopId);
  } else {
    await userWorkshopApi.assign({ user_id: userId, workshop_id: workshopId, position });
  }
};