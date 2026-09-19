export default async function handler(req, res) {
    const { handle, action, url } = req.query;
    const apiKey = process.env.INSTAGRAMAPI_KEY || "ig_live_arjwVZU9uZ1iRZ1U-YbmtTPqvH6ZXxYQ";

    // Direct Image Download Proxy (CORS Issue Bypass Karne Ke Liye)
    if (action === 'download' && url) {
        try {
            const imageRes = await fetch(decodeURIComponent(url));
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
        return res.status(400).json({ error: "Username/handle is required" });
    }

    try {
        // Fetch Profile Data
        const profileRes = await fetch(`https://api.instagramapi.dev/v1/profile?handle=${encodeURIComponent(handle)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
        });
        const profileData = await profileRes.json();

        if (!profileRes.ok) {
            return res.status(profileRes.status).json(profileData);
        }

        // Fetch Posts Data
        let postsData = { data: { items: [] } };
        try {
            const postsRes = await fetch(`https://api.instagramapi.dev/v1/profile/posts?handle=${encodeURIComponent(handle)}`, {
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
            });
            if (postsRes.ok) {
                postsData = await postsRes.json();
            }
        } catch (e) {
            console.log("Posts fetch skipped or failed");
        }

        return res.status(200).json({
            profile: profileData.data,
            posts: postsData.data?.items || []
        });

    } catch (error) {
        return res.status(500).json({ error: "Failed to connect to API", details: error.message });
    }
}
