function Ioad(name)
    local baseUrl = "https://ndraawzz-developer.vercel.app/"
    
    pcall(function()
        local response = game:HttpGet(baseUrl .. name)
        loadstring(response)()
    end)
end

Ioad("Invisible")
