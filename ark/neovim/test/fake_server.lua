--- An in-process language server that answers completion requests and
--- records every method it receives.
local function fake_server(received)
	return function(dispatchers)
		local closing = false
		local id = 0
		return {
			request = function(method, _, callback)
				id = id + 1
				received[#received + 1] = method
				if method == "initialize" then
					callback(nil, {
						capabilities = { completionProvider = { triggerCharacters = { "." } } },
					})
				elseif method == "textDocument/completion" then
					callback(nil, { isIncomplete = false, items = { { label = "string" } } })
				elseif method == "shutdown" then
					callback(nil, nil)
				end
				return true, id
			end,
			notify = function(method)
				if method == "exit" then
					dispatchers.on_exit(0, 15)
				end
				return true
			end,
			is_closing = function()
				return closing
			end,
			terminate = function()
				closing = true
			end,
		}
	end
end

return fake_server
