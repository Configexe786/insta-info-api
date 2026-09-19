export default async function handler(req, res) {
    const { handle, action, url } = req.query;
    const apiKey = process.env.INSTAGRAMAPI_KEY || "ig_live_arjwVZU9uZ1iRZ1U-YbmtTPqvH6ZXxYQ";

    // Direct Image Download Proxy
    if (action === 'download' && url) {
        try {
            const mediaUrl = decodeURIComponent(url);
            const imageRes = await fetch(mediaUrl);
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            res.setHeader('Content-Type', imageRes.headers.get('content-type') || 'image/jpeg');
            res.setHeader('Content-Disposition', 'attachment; filename="instagram_media.jpg"');
            return res.send(buffer);
        } catch (e) {
            return res.status(500).json({ error: "Download failed" });
        }
    }

    if (!handle) {
        return res.status(400).json({ error: "Username is required" });
    }

    try {
        // 1. Fetch Profile Data
        const profileRes = await fetch(`https://api.instagramapi.dev/v1/profile?handle=${encodeURIComponent(handle)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
        });
        const profileData = await profileRes.json();

        if (!profileRes.ok) {
            return res.status(profileRes.status).json(profileData);
        }

        const user = profileData.data || {};

        // HD Profile Picture URL Resolution
        let hqAvatar = user.hd_profile_pic_url_info?.url || user.profile_pic_url_hd || user.profile_pic_url || '';
        
        // Agar URL me size parameter hai (e.g. s150x150), usse strip karo full size ke liye
        if (hqAvatar.includes('instagram')) {
            hqAvatar = hqAvatar.replace(/\/s\d+x\d+\//, '/');
        }

        // 2. Fetch Posts Data
        let postsList = [];
        try {
            const postsRes = await fetch(`https://api.instagramapi.dev/v1/profile/posts?handle=${encodeURIComponent(handle)}`, {
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
            });
            const postsData = await postsRes.json();
            
            if (postsRes.ok && postsData.data) {
                // API responses items Array wrap karta hai
                postsList = postsData.data.items || (Array.isArray(postsData.data) ? postsData.data : []);
            }
        } catch (e) {
            console.log("Posts fetch error:", e);
        }

        return res.status(200).json({
            profile: { ...user, hq_avatar: hqAvatar },
            posts: postsList
        });

    } catch (error) {
        return res.status(500).json({ error: "Server error", details: error.message });
    }
}
