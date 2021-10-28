defmodule Dispatcher do
  use Matcher
  define_accept_types [
    any: ["*/*"],
    html: [ "text/html", "application/xhtml+html" ],
    json: [ "application/json", "application/vnd.api+json" ]
  ]

  @any %{ accept: %{ any: true } }
  @json %{ accept: %{ json: true } }
  @html %{ accept: %{ html: true } }

  ###############################################################
  # General/Shared
  ###############################################################

  get "/bestuurseenheden/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuurseenheden/"
  end

  get "/werkingsgebieden/*path", @json do
    Proxy.forward conn, path, "http://cache/werkingsgebieden/"
  end

  get "/bestuurseenheid-classificatie-codes/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuurseenheid-classificatie-codes/"
  end

  get "/bestuursorganen/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuursorganen/"
  end

  get "/bestuursorgaan-classificatie-codes/*path", @json do
    Proxy.forward conn, path, "http://cache/bestuursorgaan-classificatie-codes/"
  end

  get "/files/*path", @json do
    Proxy.forward conn, path, "http://resource/files/"
  end

  get "/files/:id/download", @any do
    Proxy.forward conn, [], "http://file/files/" <> id <> "/download"
  end

  #################################################################
  # Submissions
  #################################################################

  get "/remote-urls/*path", @json do
    Proxy.forward conn, path, "http://cache/remote-urls/"
  end

  get "/inzendingen-voor-toezicht/*path", @json do
    Proxy.forward conn, path, "http://cache/inzendingen-voor-toezicht/"
  end

  get "/submissions/*path", @json do
    Proxy.forward conn, path, "http://cache/submissions/"
  end

  get "/authenticity-types/*path", @json do
    Proxy.forward conn, path, "http://cache/authenticity-types/"
  end

  get "/tax-types/*path", @json do
    Proxy.forward conn, path, "http://cache/tax-types/"
  end

  get "/chart-of-accounts/*path", @json do
    Proxy.forward conn, path, "http://cache/chart-of-accounts/"
  end

  get "/submission-document-statuses/*path", @json do
    Proxy.forward conn, path, "http://cache/submission-document-statuses/"
  end

  get "/submission-documents/*path", @json do
    Proxy.forward conn, path, "http://cache/submission-documents/"
  end

  get "/form-data/*path", @json do
    Proxy.forward conn, path, "http://cache/form-data/"
  end

  get "/concept-schemes/*path", @json do
    Proxy.forward conn, path, "http://cache/concept-schemes/"
  end

  get "/concepts/*path", @json do
    Proxy.forward conn, path, "http://cache/concepts/"
  end

  #################################################################
  # Fallback
  #################################################################

  match "/*_", %{ last_call: true } do
    send_resp( conn, 404, "Route not found.  See config/dispatcher.ex" )
  end
end
