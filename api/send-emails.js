// api/send-emails.js (多活動支援最終版)
import { kv } from '@vercel/kv';
import nodemailer from 'nodemailer';

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).end();
    const secret = request.headers.authorization?.split(' ')[1];
    if (secret !== process.env.ADMIN_SECRET) return response.status(401).end();

    try {
        const { eventId, giftAmount } = request.body;
        if (!eventId || !giftAmount) return response.status(400).json({ message: '缺少活動 ID 或禮物金額。' });

        // 檢查環境變數
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            return response.status(500).json({ 
                message: '❌ 郵件服務未設定！請檢查環境變數 GMAIL_USER 和 GMAIL_APP_PASSWORD 是否已設定。' 
            });
        }

        // 在這裡建立 transporter，確保使用最新的環境變數
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        const data = await kv.get(`event:${eventId}:data`);

        if (!data || !data.draw_completed) return response.status(400).json({ message: '尚未抽籤，無法寄信。' });
        if (data.emails_sent) return response.status(400).json({ message: '信件已寄送過。' });
        
        const participants = data.participants || [];
        
        if (participants.length === 0) {
            return response.status(400).json({ message: '沒有參與者可以寄信。' });
        }

        // 取得活動設定（用於郵件內容）
        const config = await kv.get(`event:${eventId}:config`);
        const eventName = config?.eventName || '聖誕交換禮物';
        const eventDate = config?.eventDate || '';
        const eventLocation = config?.eventLocation || '';
        
        // 建立郵件內容
        const emailPromises = participants.map(giver => {
            const receiver = participants.find(p => p.id === giver.assigned_to);
            if (!receiver) return Promise.reject(new Error(`找不到 ID ${giver.assigned_to}`));
            
            let eventInfoHTML = '';
            if (eventDate || eventLocation) {
                eventInfoHTML = '<div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">';
                if (eventDate) {
                    eventInfoHTML += `<p style="margin: 5px 0;"><strong>📅 活動時間：</strong>${eventDate}</p>`;
                }
                if (eventLocation) {
                    eventInfoHTML += `<p style="margin: 5px 0;"><strong>📍 活動地點：</strong>${eventLocation}</p>`;
                }
                eventInfoHTML += '</div>';
            }
            
            return transporter.sendMail({
                from: `"🎅 聖誕小精靈" <${process.env.GMAIL_USER}>`,
                to: giver.email,
                subject: `🎁 ${eventName} - 你的神秘任務來囉！`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1e3a8a; text-align: center;">🎄 ${eventName} 🎄</h2>
                        <p>哈囉 <strong>${giver.name}</strong>，</p>
                        <p>你的神秘聖誕任務來囉！✨</p>
                        
                        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 5px 0;"><strong>💰 禮物金額：</strong>${giftAmount}</p>
                        </div>
                        
                        ${eventInfoHTML}
                        
                        <p>你的任務是為一位神秘的朋友準備禮物，這位朋友的願望是：</p>
                        
                        <blockquote style="background: #e0e7ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 15px 0; border-radius: 4px;">
                            <p style="font-style: italic; color: #5b21b6; margin: 0;">"${receiver.wish}"</p>
                        </blockquote>
                        
                        <p>請用心準備，並在交換禮物當天帶到現場喔！🤫</p>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        
                        <p style="color: #6b7280; font-size: 0.9em; text-align: center;">
                            記得保密，不要讓別人知道你抽到誰囉～<br>
                            祝你有個美好的聖誕節！🎅🎁
                        </p>
                    </div>
                `
            });
        });

        await Promise.all(emailPromises);

        data.emails_sent = true;
        await kv.set(`event:${eventId}:data`, data);
        
        return response.status(200).json({ message: `成功寄出 ${participants.length} 封通知信！` });

    } catch (error) {
        console.error('Send Emails API Error:', error);
        return response.status(500).json({ message: `寄信失敗: ${error.message}` });
    }
}