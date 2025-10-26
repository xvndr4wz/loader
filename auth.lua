function Ioad(name)
    local sources = {
        "https://loader-draaxz.pages.dev/",
        "https://ndraawzz-developer.vercel.app/"
    }

    for _, baseUrl in ipairs(sources) do
        local ok, err = pcall(function()
            local response = game:HttpGet(baseUrl .. name .. ".lua")
            loadstring(response)()
        end)
        if ok then
            print("Loaded from: ".. baseUrl .. name .. ".lua")
            return
        else
            warn("Gagal: ".. tostring(err))
        end
    end

    warn("Gagal memuat script: ".. tostring(name))
end

-- panggil cukup dengan nama (tanpa leading slash atau .lua)
Ioad("Invisible")
