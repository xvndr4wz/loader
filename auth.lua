function Ioad(name)
    local base = "https://ndraawzz-developer.vercel.app/"

    local function try(url)
        return pcall(function()
            local s = game:HttpGet(url)
            loadstring(s)()
        end)
    end

    if tostring(name):match("^https?://") then
        return try(name)
    end

    return try(base .. tostring(name))
end

-- contoh pemakaian:
-- kalau di repo ada file bernama "1234567" (tanpa ekstensi),
-- cukup:
Ioad("Invisible")

-- atau langsung:
-- loadstring(game:HttpGet('https://ndraawzz-developer.vercel.app/1234567'))()
