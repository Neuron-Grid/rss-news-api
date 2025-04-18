import { Inject, Injectable, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { Request } from 'express'
import { Database } from './types/schema'

@Injectable({ scope: Scope.REQUEST })
export class SupabaseRequestService {
    private supabaseAnon: SupabaseClient<Database>
    private supabaseAdmin: SupabaseClient<Database>

    constructor(@Inject(REQUEST) private readonly req: Request) {
        const url = process.env.SUPABASE_URL
        const anonKey = process.env.SUPABASE_ANON_KEY
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!url || !anonKey) {
            throw new Error(
                'Missing Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY).',
            )
        }
        if (!serviceRoleKey) {
            throw new Error('Missing Supabase environment variable (SUPABASE_SERVICE_ROLE_KEY).')
        }

        // Authorization ヘッダから JWT (アクセストークン) を抽出
        const authHeader = this.req.headers.authorization ?? ''
        const token = authHeader.replace(/^Bearer\s+/, '')

        // 通常ユーザー操作向けクライアント
        // anonKey使用 + スキーマ型付
        this.supabaseAnon = createClient<Database>(url, anonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
        })

        // 管理操作向けクライアント
        // Service Role Key使用 + スキーマ型付
        this.supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })
    }

    // 通常操作に使うクライアント
    // Anon Key使用
    getClient(): SupabaseClient<Database> {
        return this.supabaseAnon
    }

    // 管理権限操作に使うクライアント
    // Service Role Key使用
    getAdminClient(): SupabaseClient<Database> {
        return this.supabaseAdmin
    }
}
