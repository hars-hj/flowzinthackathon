import { supabaseAnon, supabaseAdmin } from '../../lib/supabaseClient.js';
export async function register(req, res) {
    const { email, password, name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const { data, error } = await supabaseAnon.auth.signUp({ email, password });
    if (error)
        return res.status(400).json({ error: error.message });
    return res.status(201).json({
        message: 'Registration successful. Check your email to confirm.',
        userId: data.user?.id,
    });
}
export async function registerAdmin(req, res) {
    const { email, password, adminSecret } = req.body;
    if (adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
        return res.status(403).json({ error: 'Invalid admin secret' });
    }
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    // 1. Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (error)
        return res.status(400).json({ error: error.message });
    // 2. Set role to admin in profiles table
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);
    if (profileError)
        return res.status(500).json({ error: 'Failed to set admin role' });
    return res.status(201).json({
        message: 'Admin account created successfully',
        userId: data.user.id,
    });
}
export async function login(req, res) {
    const { email, password, adminSecret, role } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    if (role === 'admin') {
        if (!adminSecret || adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
            return res.status(403).json({ error: 'Invalid admin secret' });
        }
    }
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error)
        return res.status(401).json({ error: error.message });
    if (role === 'admin') {
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
        if (profileError || !profile || profile.role !== 'admin') {
            return res.status(403).json({ error: 'This account does not have admin access' });
        }
    }
    return res.status(200).json({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
            id: data.user.id,
            email: data.user.email,
        },
    });
}
export async function getMe(req, res) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    return res.status(200).json({ user });
}
export async function refreshToken(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }
    const { data, error } = await supabaseAnon.auth.refreshSession({
        refresh_token: refreshToken,
    });
    if (error)
        return res.status(401).json({ error: error.message });
    return res.status(200).json({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
    });
}
