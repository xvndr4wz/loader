return function(id)
    local url = "https://loader-5xf.pages.dev/" .. id
    local success, response = pcall(game.HttpGet, game, url)
    if success then
        return loadstring(response)()
    else
        warn("Failed to load script:", id)
    end
end
