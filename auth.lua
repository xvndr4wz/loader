function load(name)
    local baseUrl = "https://ndraawzz-developer.vercel.app/"
    
    local success, err = pcall(function()
        loadstring(game:HttpGet(baseUrl .. name))()
    end)
    
    if not success then
        warn("Gagal memuat script: " .. tostring(name) .. " - " .. tostring(err))
        return false
    end
    
    return true
end

load("Invisible")
