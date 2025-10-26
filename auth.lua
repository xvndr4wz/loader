function Ioad(name)
    local baseUrl = "https://ndraawzz-developer.vercel.app/"
    
    local success, err = pcall(function()
        loadstring(game:HttpGet(baseUrl .. name))()
    end)
    
    if not success then
        warn("Gagal memuat script: " .. tostring(name))
        return false
    end
    
    return true
end

-- Auto-load Invisible
Ioad("Invisible")
