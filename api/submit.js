// api/submit.js (多活動支援最終版)
// (Nodemailer 設定部分省略)
import { kv } from '@vercel/kv';
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({ /* ... */ });
const ADMIN_EMAIL = 'paulcherng@hotmail.com';

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).end();

    try {
        const { eventId, name, email, group_id, wish } = request.body;
        if (!eventId) return response.status(400).json({ message: '無效的活動連結。' });

        const config = await kv.get(`event:${eventId}:config`);
        const data = await kv.get(`event:${eventId}:data`);
        
        if (!config) return response.status(404).json({ message: '找不到此活動。' });
        if (data && data.draw_completed) return response.status(400).json({ message: '此活動已截止報名。' });

        let participants = Array.isArray(data) ? data : [];
        const totalLimit = config.groups.reduce((sum, g) => sum + g.limit, 0);

        // ... (修改願望與新增參與者的邏輯，與之前類似但現在基於 eventId)
        const lowerCaseEmail = email.toLowerCase().trim();
        const existingParticipantIndex = participants.findIndex(p => p.email === lowerCaseEmail && p.group_id === group_id);
        
        let responseMessage = '';
        let justReachedFull = false;

        if (existingParticipantIndex > -1) {
            participants[existingParticipantIndex].name = name.trim();
            participants[existingParticipantIndex].wish = wish.trim();
            responseMessage = '您的願望已成功更新！';
        } else {
            if (participants.length >= totalLimit) return response.status(400).json({ message: '所有名額已滿！' });
            
            const groupConfig = config.groups.find(g => g.id === group_id);
            if (!groupConfig) return response.status(400).json({ message: '無效的組別。' });
            const groupCount = participants.filter(p => p.group_id === group_id).length;
            if (groupCount >= groupConfig.limit) return response.status(400).json({ message: '此組名額已滿！' });

            participants.push({
                id: participants.length + 1, name: name.trim(), email: lowerCaseEmail, group_id, wish: wish.trim(),
            });
            responseMessage = '提交成功，感謝您的參與！';

            if (participants.length === totalLimit) {
                justReachedFull = true;
            }
        }

        await kv.set(`event:${eventId}:data`, participants);

        if (justReachedFull) {
            // ... (滿員通知管理員的邏輯不變)
        }
        
        return response.status(201).json({ message: responseMessage });

    } catch (error) {
        console.error('Submit API Error:', error);
        return response.status(500).json({ message: '伺服器內部錯誤' });
    }
}