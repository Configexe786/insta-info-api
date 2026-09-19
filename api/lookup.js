export default async function handler(req, res) {
    const { handle, action, url } = req.query;
    const apiKey = process.env.INSTAGRAMAPI_KEY || "ig_live_arjwVZU9uZ1iRZ1U-YbmtTPqvH6ZXxYQ";

    // Media & DP Download Proxy
    if (action === 'download' && url) {
        try {
            const mediaUrl = decodeURIComponent(url);
            const imageRes = await fetch(mediaUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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

    try {
        const authHeader = { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' };

        // 1. Fetch Profile Info
        const profileRes = await fetch(`https://api.instagramapi.dev/v1/profile?handle=${encodeURIComponent(handle)}`, { headers: authHeader });
        const profileData = await profileRes.json();

        if (!profileRes.ok) {
            return res.status(profileRes.status).json(profileData);
        }

        const user = profileData.data || {};

        // Extract FULL HD Original Profile Pic (Bypassing low-res thumbnails)
        let rawAvatar = user.hd_profile_pic_url_info?.url || user.profile_pic_url_hd || user.profile_pic_url || '';
        let hqAvatar = rawAvatar;

        if (hqAvatar) {
            // Strip dimension filters to get original HD asset
            hqAvatar = hqAvatar
                .replace(/\/s\d+x\d+\//, '/')
                .replace(/\/vp\/[a-f0-9]+\//, '/')
                .replace(/stp=dst-jpg_s\d+x\d+/, 'stp=dst-jpg');
        }

        // 2. Fetch Posts & Reels Parallelly
        const [postsRes, reelsRes] = await Promise.allSettled([
            fetch(`https://api.instagramapi.dev/v1/profile/posts?handle=${encodeURIComponent(handle)}`, { headers: authHeader }),
            fetch(`https://api.instagramapi.dev/v1/profile/reels?handle=${encodeURIComponent(handle)}`, { headers: authHeader })
        ]);

        let allMedia = [];

        if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
            const pData = await postsRes.value.json();
            const items = pData.data?.items || (Array.isArray(pData.data) ? pData.data : []);
            allMedia.push(...items);
        }

        if (reelsRes.status === 'fulfilled' && reelsRes.value.ok) {
            const rData = await reelsRes.value.json();
            const items = rData.data?.items || (Array.isArray(rData.data) ? rData.data : []);
            allMedia.push(...items);
        }

        // Remove duplicate items
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
            profile: { ...user, hq_avatar: hqAvatar },
            media: uniqueMedia
        });

    } catch (error) {
        return res.status(500).json({ error: "Server error", details: error.message });
    }
}
