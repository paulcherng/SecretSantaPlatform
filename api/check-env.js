// api/check-env.js - 環境變數檢查工具

export default async function handler(request, response) {
    // 只允許 GET 請求
    if (request.method !== 'GET') {
        return response.status(405).json({ error: '只支援 GET 請求' });
    }

    // 檢查管理員權限
    const secret = request.headers.authorization?.split(' ')[1];
    if (secret !== process.env.ADMIN_SECRET) {
        return response.status(401).json({ error: '需要管理員權限' });
    }

    // 檢查所有必要的環境變數
    const envCheck = {
        ADMIN_SECRET: {
            exists: !!process.env.ADMIN_SECRET,
            value: process.env.ADMIN_SECRET ? '✅ 已設定' : '❌ 未設定',
        },
        GMAIL_USER: {
            exists: !!process.env.GMAIL_USER,
            value: process.env.GMAIL_USER ? `✅ ${process.env.GMAIL_USER}` : '❌ 未設定',
        },
        GMAIL_APP_PASSWORD: {
            exists: !!process.env.GMAIL_APP_PASSWORD,
            value: process.env.GMAIL_APP_PASSWORD 
                ? `✅ 已設定 (長度: ${process.env.GMAIL_APP_PASSWORD.length} 字元)` 
                : '❌ 未設定',
        },
        KV_REST_API_URL: {
            exists: !!process.env.KV_REST_API_URL,
            value: process.env.KV_REST_API_URL ? '✅ 已設定' : '❌ 未設定',
        },
        KV_REST_API_TOKEN: {
            exists: !!process.env.KV_REST_API_TOKEN,
            value: process.env.KV_REST_API_TOKEN ? '✅ 已設定' : '❌ 未設定',
        },
    };

    // 計算設定完成度
    const totalVars = Object.keys(envCheck).length;
    const setVars = Object.values(envCheck).filter(v => v.exists).length;
    const percentage = Math.round((setVars / totalVars) * 100);

    return response.status(200).json({
        status: setVars === totalVars ? '✅ 所有環境變數都已設定' : '⚠️ 有環境變數尚未設定',
        completion: `${setVars}/${totalVars} (${percentage}%)`,
        variables: envCheck,
        recommendations: getRecommendations(envCheck),
    });
}

function getRecommendations(envCheck) {
    const recommendations = [];

    if (!envCheck.ADMIN_SECRET.exists) {
        recommendations.push('❌ 請設定 ADMIN_SECRET（後台管理密碼）');
    }

    if (!envCheck.GMAIL_USER.exists) {
        recommendations.push('❌ 請設定 GMAIL_USER（Gmail 帳號）');
    }

    if (!envCheck.GMAIL_APP_PASSWORD.exists) {
        recommendations.push('❌ 請設定 GMAIL_APP_PASSWORD（Gmail 應用程式密碼）');
    } else if (envCheck.GMAIL_APP_PASSWORD.exists) {
        const length = process.env.GMAIL_APP_PASSWORD.length;
        if (length < 16) {
            recommendations.push('⚠️ GMAIL_APP_PASSWORD 長度似乎不正確（應該是 16 字元）');
        }
    }

    if (!envCheck.KV_REST_API_URL.exists || !envCheck.KV_REST_API_TOKEN.exists) {
        recommendations.push('❌ 請在 Vercel 專案中建立 KV 資料庫');
    }

    if (recommendations.length === 0) {
        recommendations.push('✅ 所有環境變數都已正確設定！');
    }

    return recommendations;
}
