local ok, err = pcall(function()
    local s = game:HttpGet('https://ndraawzz-developer.vercel.app/auth.lua')
    local f = loadstring(s)
    if not f then error("compile error") end
    f()
end)

if ok and type(Ioad) == "function" then
    Ioad("Invisible")
else
    warn("Gagal auth atau Ioad tidak tersedia: "..tostring(err))
end
