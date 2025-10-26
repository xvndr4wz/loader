function Ioad(name)
    local sources = {
        "https://loader-draaxz.pages.dev/",
        "https://ndraawzz-developer.vercel.app/"
    }

    local loaded = false
    for _, baseUrl in ipairs(sources) do
        local success, err = pcall(function()
            local response = game:HttpGet(baseUrl .. name)
            loadstring(response)()
        end)
        if success then
            loaded = true
            break
        end
    end

    if not loaded then
        warn("Gagal memuat script dari semua sumber: " .. tostring(name))
    end
end
