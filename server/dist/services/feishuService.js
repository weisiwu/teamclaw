/**
 * Feishu Service
 * 飞书开放平台 API 调用封装
 */
const FEISHU_BASE_URL = 'https://open.feishu.cn';
/**
 * 获取 Feishu App Access Token
 * 文档: https://open.feishu.cn/document/server-docs/authentication-management/access-token/app_access_token_internal
 */
/**
 * 获取 Feishu App Access Token
 * 文档: https://open.feishu.cn/document/server-docs/authentication-management/access-token/app_access_token_internal
 */
async function getAppAccessToken(appId, appSecret) {
    const response = await fetch(`${FEISHU_BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            app_id: appId,
            app_secret: appSecret,
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to get app access token: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.code !== 0) {
        throw new Error(`Feishu API error: ${data.code} ${data.msg}`);
    }
    return data.app_access_token;
}
/**
 * 获取 Feishu 消息历史
 * 文档: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/list
 */
export async function getFeishuMessages(params) {
    const { appId, appSecret, containerIdType, containerId, startTime, endTime, pageSize = 20, pageToken, sortType = 'ByCreateTimeDesc' } = params;
    // Get access token
    const accessToken = await getAppAccessToken(appId, appSecret);
    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.set('container_id_type', containerIdType);
    queryParams.set('container_id', containerId);
    queryParams.set('page_size', String(pageSize));
    queryParams.set('sort_type', sortType);
    if (pageToken) {
        queryParams.set('page_token', pageToken);
    }
    if (startTime) {
        queryParams.set('start_time', String(Math.floor(new Date(startTime).getTime() / 1000)));
    }
    if (endTime) {
        queryParams.set('end_time', String(Math.floor(new Date(endTime).getTime() / 1000)));
    }
    const url = `${FEISHU_BASE_URL}/open-apis/im/v1/messages?${queryParams.toString()}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch Feishu messages: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.code !== 0) {
        throw new Error(`Feishu API error: ${data.code} ${data.msg}`);
    }
    const items = data.data?.items || [];
    return {
        messages: items.map(item => ({
            messageId: item.message_id,
            createTime: item.create_time,
            sender: {
                senderType: item.sender.sender_type,
                senderId: item.sender.sender_id,
            },
            body: item.body,
            chatId: item.chat_id,
            chatType: item.chat_type,
        })),
        pageToken: data.data?.page_token,
        hasMore: data.data?.has_more ?? false,
    };
}
/**
 * 获取用户信息
 */
export async function getFeishuUserInfo(params) {
    const { appId, appSecret, userId } = params;
    const accessToken = await getAppAccessToken(appId, appSecret);
    // Try to get user info
    const response = await fetch(`${FEISHU_BASE_URL}/open-apis/contact/v3/users/${userId}?user_id_type=open_id`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        return { name: '未知用户' };
    }
    const data = await response.json();
    if (data.code !== 0 || !data.data?.user) {
        return { name: '未知用户' };
    }
    return {
        name: data.data.user.name || '未知用户',
        avatarUrl: data.data.user.avatar?.avatar_72,
        email: data.data.user.email,
    };
}
/**
 * 获取群成员列表
 */
export async function getFeishuChatMembers(params) {
    const { appId, appSecret, chatId, pageSize = 50, pageToken } = params;
    const accessToken = await getAppAccessToken(appId, appSecret);
    const queryParams = new URLSearchParams();
    queryParams.set('member_id_type', 'open_id');
    queryParams.set('page_size', String(pageSize));
    if (pageToken) {
        queryParams.set('page_token', pageToken);
    }
    const response = await fetch(`${FEISHU_BASE_URL}/open-apis/im/v1/chats/${chatId}/members?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch chat members: ${response.status}`);
    }
    const data = await response.json();
    if (data.code !== 0) {
        throw new Error(`Feishu API error: ${data.code} ${data.msg}`);
    }
    const items = data.data?.items || [];
    return {
        members: items.map(item => ({
            memberId: item.member_id,
            name: item.name,
            avatarUrl: item.avatar?.avatar_72,
            memberIdType: item.member_id_type,
        })),
        pageToken: data.data?.page_token,
        hasMore: data.data?.has_more ?? false,
    };
}
/**
 * 发送飞书消息（文本）
 * 文档: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/create
 */
export async function sendFeishuMessage(params) {
    const { appId, appSecret, receiveIdType, receiveId, msgType, content } = params;
    const accessToken = await getAppAccessToken(appId, appSecret);
    const response = await fetch(`${FEISHU_BASE_URL}/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            receive_id: receiveId,
            msg_type: msgType,
            content,
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to send Feishu message: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.code !== 0) {
        throw new Error(`Feishu API error: ${data.code} ${data.msg}`);
    }
    return { messageId: data.data?.message_id ?? '' };
}
/**
 * 发送飞书消息（富文本卡片）
 * 文档: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/create
 */
export async function sendFeishuCard(params) {
    const { appId, appSecret, receiveIdType, receiveId, card } = params;
    const accessToken = await getAppAccessToken(appId, appSecret);
    const response = await fetch(`${FEISHU_BASE_URL}/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            receive_id: receiveId,
            msg_type: 'interactive',
            content: JSON.stringify(card),
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to send Feishu card: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.code !== 0) {
        throw new Error(`Feishu API error: ${data.code} ${data.msg}`);
    }
    return { messageId: data.data?.message_id ?? '' };
}
/**
 * 获取飞书配置（从环境变量）
 */
export function getFeishuConfig() {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;
    const chatId = process.env.FEISHU_CHAT_ID;
    if (appId && appSecret) {
        return { appId, appSecret, chatId };
    }
    return null;
}
