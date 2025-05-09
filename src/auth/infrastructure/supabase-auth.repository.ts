import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { SupabaseRequestService } from 'src/supabase-request.service'
import { AuthRepositoryPort } from '../domain/auth.repository'

@Injectable()
export class SupabaseAuthRepository implements AuthRepositoryPort {
    constructor(private readonly supabaseReq: SupabaseRequestService) {}

    // 認証
    async signUp(email: string, password: string, username: string) {
        const sb = this.supabaseReq.getClient()
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { username } },
        })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
        return data
    }

    async signIn(email: string, password: string) {
        const sb = this.supabaseReq.getClient()
        const { data, error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw new HttpException(error.message, HttpStatus.UNAUTHORIZED)
        return data
    }

    async signOut(): Promise<void> {
        const sb = this.supabaseReq.getClient()
        const { error } = await sb.auth.signOut()
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }

    // アカウント削除
    // RLSバイパス
    async deleteAccount(userId: string) {
        try {
            return await this.supabaseReq.deleteUserAccount(userId)
        } catch (err: unknown) {
            if (err instanceof Error) {
                throw new HttpException(err.message, HttpStatus.BAD_REQUEST)
            }
            throw new HttpException('Unknown error', HttpStatus.BAD_REQUEST)
        }
    }

    // プロフィール更新
    async updateEmail(userId: string, newEmail: string) {
        const sb = this.supabaseReq.getClient()

        const { data, error } = await sb.auth.updateUser({ email: newEmail })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)

        const { error: upErr } = await sb.from('users').update({ email: newEmail }).eq('id', userId)
        if (upErr) throw new HttpException(upErr.message, HttpStatus.BAD_REQUEST)
        return data
    }

    async updateUsername(userId: string, newUsername: string) {
        const sb = this.supabaseReq.getClient()

        const { data, error } = await sb.auth.updateUser({ data: { username: newUsername } })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)

        const { error: upErr } = await sb
            .from('users')
            .update({ username: newUsername })
            .eq('id', userId)
        if (upErr) throw new HttpException(upErr.message, HttpStatus.BAD_REQUEST)
        return data
    }

    async updatePassword(userEmail: string, oldPw: string, newPw: string) {
        const sb = this.supabaseReq.getClient()

        const { error: signErr } = await sb.auth.signInWithPassword({
            email: userEmail,
            password: oldPw,
        })
        if (signErr) throw new HttpException('Old password is incorrect', HttpStatus.UNAUTHORIZED)

        const { data, error } = await sb.auth.updateUser({ password: newPw })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
        return data
    }

    // パスワードリセット
    async forgotPassword(email: string, redirectUrl: string) {
        const sb = this.supabaseReq.getClient()
        const { data, error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
        return data
    }

    async resetPassword(accessToken: string, newPw: string) {
        const sb = this.supabaseReq.getClient()
        await sb.auth.setSession({ access_token: accessToken, refresh_token: '' })
        const { data, error } = await sb.auth.updateUser({ password: newPw })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
        return data
    }

    // メールアドレス確認
    async verifyEmail(email: string, token: string) {
        const sb = this.supabaseReq.getClient()
        const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
        return data
    }

    // TOTP
    async verifyTotp(factorId: string, code: string) {
        const sb = this.supabaseReq.getClient()

        const { data: challenge, error: chErr } = await sb.auth.mfa.challenge({ factorId })
        if (chErr || !challenge)
            throw new HttpException(chErr?.message ?? 'Challenge failed', HttpStatus.BAD_REQUEST)

        const { data, error } = await sb.auth.mfa.verify({
            factorId,
            challengeId: challenge.id,
            code,
        })
        if (error) throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
        return data
    }
}
