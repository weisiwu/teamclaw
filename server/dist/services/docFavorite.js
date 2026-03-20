/**
 * 文档收藏服务
 * 用户收藏文档、查看收藏列表、访问历史
 */
class DocFavoriteService {
    favorites = new Map(); // key: userId
    accessHistory = [];
    MAX_ACCESS_HISTORY = 200;
    /**
     * 添加收藏
     */
    addFavorite(docId, userId = 'default') {
        const userFavorites = this.favorites.get(userId) || [];
        // 已收藏则跳过
        if (userFavorites.some(f => f.docId === docId)) {
            return null;
        }
        const favorite = {
            favoriteId: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            docId,
            userId,
            createdAt: new Date().toISOString(),
        };
        userFavorites.push(favorite);
        this.favorites.set(userId, userFavorites);
        return favorite;
    }
    /**
     * 取消收藏
     */
    removeFavorite(docId, userId = 'default') {
        const userFavorites = this.favorites.get(userId) || [];
        const idx = userFavorites.findIndex(f => f.docId === docId);
        if (idx === -1)
            return false;
        userFavorites.splice(idx, 1);
        this.favorites.set(userId, userFavorites);
        return true;
    }
    /**
     * 获取用户收藏列表
     */
    getFavorites(userId = 'default', docNameMap) {
        const userFavorites = this.favorites.get(userId) || [];
        return userFavorites.map(f => {
            const docInfo = docNameMap?.get(f.docId) || { name: '未知文档', type: '', size: 0 };
            return { ...f, docName: docInfo.name, docType: docInfo.type, docSize: docInfo.size };
        });
    }
    /**
     * 检查是否已收藏
     */
    isFavorite(docId, userId = 'default') {
        const userFavorites = this.favorites.get(userId) || [];
        return userFavorites.some(f => f.docId === docId);
    }
    /**
     * 记录文档访问
     */
    recordAccess(docId, userId = 'default') {
        // 移除同一用户的同文档旧记录
        this.accessHistory = this.accessHistory.filter(r => !(r.docId === docId && r.userId === userId));
        // 添加新记录
        this.accessHistory.unshift({
            docId,
            userId,
            accessedAt: new Date().toISOString(),
        });
        // 限制历史长度
        if (this.accessHistory.length > this.MAX_ACCESS_HISTORY) {
            this.accessHistory = this.accessHistory.slice(0, this.MAX_ACCESS_HISTORY);
        }
    }
    /**
     * 获取最近访问的文档
     */
    getRecentAccess(userId = 'default', limit = 10, docNameMap) {
        const records = this.accessHistory
            .filter(r => r.userId === userId)
            .slice(0, limit);
        return records.map(r => {
            const docInfo = docNameMap?.get(r.docId) || { name: '未知文档', type: '' };
            return {
                docId: r.docId,
                docName: docInfo.name,
                docType: docInfo.type,
                accessedAt: r.accessedAt,
            };
        });
    }
}
export const docFavoriteService = new DocFavoriteService();
