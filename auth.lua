local website = game:HttpGet("https://ndraawzz-developer.vercel.app/")

if Ioad == nil or IoadClone == nil then
   Ioad = nil
   loadstring(website)()
   if IoadClone == nil and Ioad ~= nil then
      IoadClone = Ioad
   end
end

if Ioad ~= IoadClone then
   Ioad = IoadClone
end
