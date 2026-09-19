export default async function handler(req, res) {
    const { handle } = req.query;
    if (!handle) {
        return res.status(400).json({ error: "Username/handle is required" });
    }

    try {
        const apiKey = process.env.INSTAGRAMAPI_KEY || "ig_live_arjwVZU9uZ1iRZ1U-YbmtTPqvH6ZXxYQ";
        
        const response = await fetch(`https://api.instagramapi.dev/v1/profile?handle=${encodeURIComponent(handle)}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Failed to connect to API", details: error.message });
    }
}
