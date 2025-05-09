import { Injectable, Logger } from '@nestjs/common'
import { PaginatedResult } from 'src/common/interfaces/paginated-result.interface'
import { Database } from 'src/types/schema'
import { SubscriptionRepository } from '../infrastructure/subscription.repository'
import { UpdateSubscriptionDto } from './dto/update-subscription.dto'

type Row = Database['public']['Tables']['user_subscriptions']['Row']

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name)

    constructor(private readonly repo: SubscriptionRepository) {}

    // ページネーション付き一覧
    async getSubscriptionsPaginated(
        userId: string,
        page: number,
        limit: number,
    ): Promise<PaginatedResult<Row>> {
        return await this.repo.findByUserIdPaginated(userId, page, limit)
    }

    // 単一購読をIDで取得
    // 存在しない場合はnull
    async getSubscriptionById(userId: string, subId: number) {
        return await this.repo.findOne(subId, userId)
    }

    // next_fetch_at ≤ cutoffの購読を取得
    async findDueSubscriptions(cutoff: Date) {
        return await this.repo.findDueSubscriptions(cutoff)
    }

    // 購読を追加
    async addSubscription(userId: string, feedUrl: string, feedTitle: string) {
        return await this.repo.insertSubscription(userId, feedUrl, feedTitle)
    }

    // フィード取得完了を記録
    // last_fetched_at のみ更新
    async markFetched(subId: number, userId: string, fetchedAt: Date) {
        await this.repo.updateLastFetched(subId, userId, fetchedAt)
    }

    // feed_titleのみ更新
    async updateSubscription(userId: string, subId: number, dto: UpdateSubscriptionDto) {
        const sub = await this.repo.findOne(subId, userId)
        if (!sub) {
            throw new Error(`Subscription not found (id=${subId}, user=${userId})`)
        }
        return await this.repo.updateSubscriptionTitle(subId, userId, dto.feed_title)
    }

    // 購読を削除
    async deleteSubscription(userId: string, subId: number) {
        const sub = await this.repo.findOne(subId, userId)
        if (!sub) {
            throw new Error(`Subscription not found (id=${subId}, user=${userId})`)
        }
        await this.repo.deleteSubscription(subId, userId)
    }
}
