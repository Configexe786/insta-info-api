export default async function handler(req, res) {
    const { handle, action, url } = req.query;
    const apiKey = process.env.INSTAGRAMAPI_KEY || "ig_live_arjwVZU9uZ1iRZ1U-YbmtTPqvH6ZXxYQ";

    // Media & HD DP Proxy Download Route
    if (action === 'download' && url) {
        try {
            const mediaUrl = decodeURIComponent(url);
            const imageRes = await fetch(mediaUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const contentType = imageRes.headers.get('content-type') || (mediaUrl.includes('.mp4') ? 'video/mp4' : 'image/jpeg');
            const ext = contentType.includes('mp4') || mediaUrl.includes('.mp4') ? 'mp4' : 'jpg';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="instagram_download.${ext}"`);
            return res.send(buffer);
        } catch (e) {
            return res.status(500).json({ error: "Download failed" });
        }
    }

    if (!handle) {
        return res.status(400).json({ error: "Username is required" });
    }

    const cleanHandle = handle.trim().replace('@', '');

    try {
        const authHeader = { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' };

        // Fetch Data Parallelly
        const [profileRes, postsRes, reelsRes] = await Promise.allSettled([
            fetch(`https://api.instagramapi.dev/v1/profile?handle=${encodeURIComponent(cleanHandle)}`, { headers: authHeader }),
            fetch(`https://api.instagramapi.dev/v1/profile/posts?handle=${encodeURIComponent(cleanHandle)}`, { headers: authHeader }),
            fetch(`https://api.instagramapi.dev/v1/profile/reels?handle=${encodeURIComponent(cleanHandle)}`, { headers: authHeader })
        ]);

        let rawUser = {};
        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
            const profileData = await profileRes.value.json();
            rawUser = profileData.data || profileData.user || profileData || {};
        }

        // Handle Safe Field Mapping (Fix for undefined values)
        const username = rawUser.username || rawUser.handle || cleanHandle;
        const fullName = rawUser.full_name || rawUser.name || rawUser.username || cleanHandle;
        const biography = rawUser.biography || rawUser.bio || 'No bio available';
        const followers = rawUser.follower_count ?? rawUser.followers ?? rawUser.edge_followed_by?.count ?? 0;
        const following = rawUser.following_count ?? rawUser.following ?? rawUser.edge_follow?.count ?? 0;
        const postsCount = rawUser.media_count ?? rawUser.posts_count ?? rawUser.posts ?? rawUser.edge_owner_to_timeline_media?.count ?? 0;

        // DP URL Resolution Strategy
        let rawAvatar = rawUser.hd_profile_pic_url_info?.url || 
                         rawUser.profile_pic_url_hd || 
                         rawUser.hd_profile_pic_versions?.[0]?.url || 
                         rawUser.profile_pic_url || '';

        if (!rawAvatar) {
            rawAvatar = `https://instasaver.io/api/v1/dp?username=${encodeURIComponent(cleanHandle)}`;
        }

        // Clean Resolution Limits from Instagram CDN links
        if (rawAvatar && rawAvatar.includes('instagram')) {
            rawAvatar = rawAvatar
                .replace(/\/s\d+x\d+\//, '/')
                .replace(/\/vp\/[a-f0-9]+\//, '/')
                .replace(/stp=dst-jpg_s\d+x\d+/, 'stp=dst-jpg');
        }

        // Parse Posts & Reels safely
        let allMedia = [];

        if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
            const pData = await postsRes.value.json();
            const items = pData.data?.items || pData.items || (Array.isArray(pData.data) ? pData.data : []);
            allMedia.push(...items);
        }

        if (reelsRes.status === 'fulfilled' && reelsRes.value.ok) {
            const rData = await reelsRes.value.json();
            const items = rData.data?.items || rData.items || (Array.isArray(rData.data) ? rData.data : []);
            allMedia.push(...items);
        }

        const uniqueMedia = [];
        const seenIds = new Set();

        for (const item of allMedia) {
            const id = item.id || item.pk || item.code;
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                uniqueMedia.push(item);
            }
        }

        return res.status(200).json({
            profile: {
                username,
                full_name: fullName,
                biography,
                followers,
                following,
                posts_count: postsCount,
                hq_avatar: rawAvatar
            },
            media: uniqueMedia
        });

    } catch (error) {
        return res.status(500).json({ error: "Server error", details: error.message });
    }
}
