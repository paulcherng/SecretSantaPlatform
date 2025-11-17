// api/delete-user.js (多活動支援最終版)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).end();
    const secret = request.headers.authorization?.split(' ')[1];
    if (secret !== process.env.ADMIN_SECRET) return response.status(401).end();

    try {
        const { eventId, userId } = request.body;
        if (!eventId || !userId) return response.status(400).json({ message: '缺少活動或使用者 ID。' });

        const data = await kv.get(`event:${eventId}:data`);
        
        if (data && data.draw_completed) return response.status(400).json({ message: '抽籤已完成，無法刪除！' });
        
        let participants = Array.isArray(data) ? data : [];
        const newParticipants = participants.filter(p => p.id !== userId)
                                          .map((p, index) => ({ ...p, id: index + 1 })); // 重新索引

        await kv.set(`event:${eventId}:data`, newParticipants);

        return response.status(200).json({ message: `成功刪除使用者 ID: ${userId}` });
    } catch (error) {
        console.error('Delete User API Error:', error);
        return response.status(500).json({ message: '伺服器內部錯誤' });
    }
}