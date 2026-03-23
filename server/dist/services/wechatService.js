/**
 * WeChat Service
 * 微信 Bot SDK 封装
 *
 * 提供微信消息的接收和发送接口
 * 当前实现为 webhook 接收模式，后续可接入 wechaty 等 SDK
 */
/**
 * 获取微信配置（从环境变量）
 */
export function getWeChatConfig() {
    return {
        enabled: process.env.WECHAT_ENABLED === 'true',
        token: process.env.WECHAT_VERIFY_TOKEN,
        encodingAesKey: process.env.WECHAT_ENCODING_AES_KEY,
        webhookUrl: process.env.WECHAT_WEBHOOK_URL,
    };
}
/**
 * 微信消息处理器接口
 * 接收微信消息并转换为内部格式
 */
export function parseWeChatMessage(payload) {
    try {
        // 企业微信回调格式
        const msg = {
            msgId: String(payload.msgid ?? payload.MsgId ?? payload.MsgID ?? Date.now()),
            fromUserName: String(payload.fromusername ?? payload.FromUserName ?? ''),
            toUserName: String(payload.tousername ?? payload.ToUserName ?? ''),
            content: String(payload.content ?? payload.Content ?? ''),
            msgType: String(payload.msgtype ?? payload.MsgType ?? 'text').toLowerCase(),
            createTime: parseInt(String(payload.createtime ?? payload.CreateTime ?? Date.now()), 10),
            chatType: payload.roomid || payload.RoomId ? 'group' : 'personal',
            roomId: String(payload.roomid ?? payload.RoomId ?? ''),
        };
        return msg;
    }
    catch {
        return null;
    }
}
/**
 * 微信消息签名验证（用于回调 URL 验证）
 */
export function verifyWeChatSignature(token, signature, timestamp, nonce) {
    const str = [token, timestamp, nonce].sort().join('');
    // 简单的 SHA1 验证（实际生产使用 crypto 模块）
    const crypto = require('crypto');
    const sha1 = crypto.createHash('sha1').update(str).digest('hex');
    return sha1 === signature;
}
/**
 * 发送微信消息（通过企业微信 API）
 * 文档: https://developer.work.weixin.qq.com/document/path/91770
 */
export async function sendWeChatMessage(params) {
    const { corpId, corpSecret, agentId, toUser, content, msgType = 'text' } = params;
    // 获取 access token
    const tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
        throw new Error(`Failed to get WeChat access token: ${tokenData.errmsg ?? 'unknown error'}`);
    }
    // 发送消息
    const sendUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${tokenData.access_token}`;
    const response = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            touser: toUser,
            toparty: '',
            totag: '',
            msgtype: msgType,
            agentid: parseInt(agentId, 10),
            text: { content },
        }),
    });
    return response.json();
}
export const wechatService = {
    getConfig: getWeChatConfig,
    parseMessage: parseWeChatMessage,
    verifySignature: verifyWeChatSignature,
    sendMessage: sendWeChatMessage,
};
