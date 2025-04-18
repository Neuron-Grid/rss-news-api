import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger'
import { User } from '@supabase/supabase-js'
import { SupabaseAuthGuard } from 'src/auth/supabase-auth.guard'
import { SupabaseUser } from 'src/auth/supabase-user.decorator'
import { CreateTagDto } from './dto/create-tag.dto'
import { UpdateTagDto } from './dto/update-tag.dto'
import { TagService } from './tag.service'

@ApiTags('Tags')
@ApiBearerAuth()
@Controller({
    path: 'tags',
    version: '1',
})
@UseGuards(SupabaseAuthGuard)
export class TagController {
    constructor(private readonly tagService: TagService) {}

    @ApiOperation({ summary: 'Get all tags for current user' })
    @ApiResponse({ status: 200, description: 'Returns all tags for the user' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Get()
    async getAllTags(@SupabaseUser() user: User) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        try {
            const tags = await this.tagService.getAllTagsForUser(user.id)
            return { message: 'Tag list fetched', data: tags }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    @ApiOperation({ summary: 'Create a new tag' })
    @ApiResponse({ status: 201, description: 'Tag created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Post()
    async createTag(@SupabaseUser() user: User, @Body() dto: CreateTagDto) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        if (!dto.tagName) {
            throw new HttpException('tagName is required', HttpStatus.BAD_REQUEST)
        }
        try {
            const result = await this.tagService.createTagForUser(
                user.id,
                dto.tagName,
                dto.parentTagId ?? null,
            )
            return { message: 'Tag created', data: result }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    @ApiOperation({ summary: 'Update a tag' })
    @ApiParam({ name: 'tagId', description: 'ID of the tag to update' })
    @ApiResponse({ status: 200, description: 'Tag updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Patch(':tagId')
    async updateTag(
        @SupabaseUser() user: User,
        @Param('tagId', ParseIntPipe) tagId: number,
        @Body() dto: UpdateTagDto,
    ) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        try {
            const updated = await this.tagService.updateTagForUser(
                user.id,
                tagId,
                dto.newName,
                dto.newParentTagId,
            )
            return { message: 'Tag updated', data: updated }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    @ApiOperation({ summary: 'Delete a tag' })
    @ApiParam({ name: 'tagId', description: 'ID of the tag to delete' })
    @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Delete(':tagId')
    async deleteTag(@SupabaseUser() user: User, @Param('tagId', ParseIntPipe) tagId: number) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        try {
            await this.tagService.deleteTagForUser(user.id, tagId)
            return { message: 'Tag deleted' }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    // FeedItemとの紐付け
    @ApiOperation({ summary: 'Get tags for a feed item' })
    @ApiParam({ name: 'feedItemId', description: 'ID of the feed item' })
    @ApiResponse({ status: 200, description: 'Returns tags associated with the feed item' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Get('feed-items/:feedItemId')
    async getFeedItemTags(
        @SupabaseUser() user: User,
        @Param('feedItemId', ParseIntPipe) feedItemId: number,
    ) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        try {
            const result = await this.tagService.getTagsByFeedItem(user.id, feedItemId)
            return { message: 'Tags for feed item', data: result }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    @ApiOperation({ summary: 'Attach a tag to a feed item' })
    @ApiParam({ name: 'feedItemId', description: 'ID of the feed item' })
    @ApiResponse({ status: 200, description: 'Tag attached to feed item' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Post('feed-items/:feedItemId')
    async attachTagToFeedItem(
        @SupabaseUser() user: User,
        @Param('feedItemId', ParseIntPipe) feedItemId: number,
        @Body() body: { tagId: number },
    ) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        if (!body.tagId) {
            throw new HttpException('tagId is required', HttpStatus.BAD_REQUEST)
        }
        try {
            await this.tagService.attachTagToFeedItem(user.id, feedItemId, body.tagId)
            return { message: 'Tag attached to feed item' }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    @ApiOperation({ summary: 'Detach a tag from a feed item' })
    @ApiParam({ name: 'feedItemId', description: 'ID of the feed item' })
    @ApiQuery({ name: 'tagId', description: 'ID of the tag to detach' })
    @ApiResponse({ status: 200, description: 'Tag detached from feed item' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Delete('feed-items/:feedItemId')
    async detachTagFromFeedItem(
        @SupabaseUser() user: User,
        @Param('feedItemId', ParseIntPipe) feedItemId: number,
        @Query('tagId') tagId?: string,
    ) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        if (!tagId) {
            throw new HttpException('tagId is required as query', HttpStatus.BAD_REQUEST)
        }
        try {
            const parsedTagId = Number.parseInt(tagId, 10)
            await this.tagService.detachTagFromFeedItem(user.id, feedItemId, parsedTagId)
            return { message: 'Tag detached from feed item' }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    // UserSubscriptionとの紐付け
    @ApiOperation({ summary: 'Get tags for a subscription' })
    @ApiParam({ name: 'subscriptionId', description: 'ID of the subscription' })
    @ApiResponse({ status: 200, description: 'Returns tags associated with the subscription' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Get('subscriptions/:subscriptionId')
    async getSubscriptionTags(
        @SupabaseUser() user: User,
        @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
    ) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        try {
            const result = await this.tagService.getTagsBySubscription(user.id, subscriptionId)
            return { message: 'Tags for subscription', data: result }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    @ApiOperation({ summary: 'Attach a tag to a subscription' })
    @ApiParam({ name: 'subscriptionId', description: 'ID of the subscription' })
    @ApiResponse({ status: 200, description: 'Tag attached to subscription' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Post('subscriptions/:subscriptionId')
    async attachTagToSubscription(
        @SupabaseUser() user: User,
        @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
        @Body() body: { tagId: number },
    ) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        if (!body.tagId) {
            throw new HttpException('tagId is required', HttpStatus.BAD_REQUEST)
        }
        try {
            await this.tagService.attachTagToSubscription(user.id, subscriptionId, body.tagId)
            return { message: 'Tag attached to subscription' }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }

    @ApiOperation({ summary: 'Detach a tag from a subscription' })
    @ApiParam({ name: 'subscriptionId', description: 'ID of the subscription' })
    @ApiQuery({ name: 'tagId', description: 'ID of the tag to detach' })
    @ApiResponse({ status: 200, description: 'Tag detached from subscription' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Delete('subscriptions/:subscriptionId')
    async detachTagFromSubscription(
        @SupabaseUser() user: User,
        @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
        @Query('tagId') tagId?: string,
    ) {
        if (!user?.id) {
            throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED)
        }
        if (!tagId) {
            throw new HttpException('tagId is required as query', HttpStatus.BAD_REQUEST)
        }
        try {
            const parsedTagId = Number.parseInt(tagId, 10)
            await this.tagService.detachTagFromSubscription(user.id, subscriptionId, parsedTagId)
            return { message: 'Tag detached from subscription' }
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
        }
    }
}
